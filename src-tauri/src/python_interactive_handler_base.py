"""
Base handler for Interactive/Stateful Python modules.
Rust calls this file directly, and this imports user functions from the specified module.
"""
import json
import sys
import importlib.util
import os
import traceback
import logging
from typing import Any, Dict, Optional, TextIO

# Protocol IO isolation: keep a dedicated handle to original stdout for JSON messages
_PROTOCOL_OUT: Optional[TextIO] = None
_IO_ISOLATED: bool = False
_TURN_END_KEY = "_chanterelle_turn_end"


def _setup_io_isolation() -> None:
    """Reserve stdout for protocol JSON only; send all other output to stderr.

    - Duplicate original stdout (fd=1) and keep it for protocol writes.
    - Redirect fd=1 to fd=2 so accidental prints/C-level writes go to stderr.
    - Point sys.stdout to sys.stderr for Python-level print().
    - Reduce noisy ML logs and set logging to WARNING to stderr.
    """
    global _PROTOCOL_OUT, _IO_ISOLATED
    if _IO_ISOLATED:
        return

    # Reduce noise from TF before imports
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

    try:
        orig_stdout_fd = os.dup(1)
        _PROTOCOL_OUT = os.fdopen(orig_stdout_fd, "w", buffering=1, encoding="utf-8")
        os.dup2(2, 1)  # Redirect OS-level stdout to stderr
        sys.stdout = sys.stderr  # Python print -> stderr
    except Exception:
        # Fallback: at least keep a handle to original stdout
        _PROTOCOL_OUT = sys.__stdout__

    try:
        logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
    except Exception:
        pass

    _IO_ISOLATED = True


def _send_protocol_json(obj: Dict[str, Any]) -> None:
    """Write a compact JSON line to the preserved protocol stdout pipe."""
    out = _PROTOCOL_OUT or sys.__stdout__
    out.write(json.dumps(obj, separators=(",", ":")) + "\n")
    out.flush()


def load_user_handler_module(handler_path: str):
    """Load the user's handler module dynamically."""
    spec = importlib.util.spec_from_file_location("user_module", handler_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load handler from {handler_path}")
    
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def format_detailed_error(exception: Exception, context: str = "") -> dict:
    """
    Format a detailed error message with line numbers and stack trace.
    
    Args:
        exception: The caught exception
        context: Additional context about where the error occurred
        
    Returns:
        Dictionary with detailed error information
    """
    # Get the current exception info
    exc_type, exc_value, exc_tb = sys.exc_info()
    
    # Format the basic error message
    error_msg = str(exception)
    error_type = type(exception).__name__
    
    # Extract line number and file information from traceback
    line_info = []
    if exc_tb:
        tb_list = traceback.extract_tb(exc_tb)
        frame_count = 0
        max_frames = 10  # Limit to 10 frames for safety
        
        for frame in tb_list:
            # Only include frames from user code or imports, excluding this base handler
            if 'python_interactive_handler_base.py' not in frame.filename:
                line_info.append({
                    "file": os.path.basename(frame.filename),
                    "line": frame.lineno,
                    "function": frame.name,
                    "code": frame.line.strip() if frame.line else "N/A"
                })
                frame_count += 1
                if frame_count >= max_frames:
                    break
    
    # Create detailed error response
    detailed_error = {
        "error": error_msg,
        "error_type": error_type,
        "context": context,
        "traceback": line_info
    }
    
    # Add a formatted summary for easy reading
    if line_info:
        last_frame = line_info[-1]
        detailed_error["summary"] = f"{error_type}: {error_msg} (in {last_frame['file']}:{last_frame['line']})"
    else:
        detailed_error["summary"] = f"{error_type}: {error_msg}"
    
    return detailed_error


class InteractiveHandler:
    def __init__(self, handler_module_path: str):
        self.module = load_user_handler_module(handler_module_path)

    def handle_message(self, data: Dict[str, Any]) -> Any:
        try:
            command = data.get("command")
            if command == "initialize":
                # Call self.module.initialize()
                if hasattr(self.module, "initialize"):
                    return self.module.initialize()
                else:
                    return {"status": "ready", "message": "Initialized (no initialize() method found)"}
            elif hasattr(self.module, "on_input"):
                # Most user handlers expect just the input dict, not the protocol envelope.
                # If the envelope includes an "inputs" field, pass that through.
                payload = data.get("inputs") if isinstance(data, dict) else None
                return self.module.on_input(payload if isinstance(payload, dict) else data)
            else:
                return {"status": "error", "error": "Module does not implement on_input()"}
                    
        except Exception as e:
            return format_detailed_error(e, f"handling command '{data.get('command', 'unknown')}'")


if __name__ == "__main__":
    _setup_io_isolation()
    
    if len(sys.argv) < 2:
        error = {"error": "Missing usage argument", "summary": "Usage: python python_interactive_handler_base.py <path_to_module.py>"}
        _send_protocol_json(error)
        sys.exit(1)

    user_module_path = sys.argv[1]

    try:
        handler = InteractiveHandler(user_module_path)
        # Verify module has required methods or at least input_fn if we want to fallback?
        # For now, just say we are alive.
        _send_protocol_json({"status": "ready", "handler": "interactive"})

        import types

        # Main Loop
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)

                # Health check compatibility with Rust's warmup flow
                if isinstance(data, dict) and data.get("ping") is True:
                    _send_protocol_json({"pong": True, "status": "ready"})
                    continue

                # Back-compat: Rust may send plain inputs without an explicit command.
                if isinstance(data, dict) and "command" not in data:
                    if len(data) == 0:
                        data = {"command": "initialize"}
                    else:
                        data = {"command": "on_input", "inputs": data}

                result = handler.handle_message(data if isinstance(data, dict) else {"command": "on_input", "inputs": data})

                if isinstance(result, types.GeneratorType):
                    for partial in result:
                        payload = partial or {}
                        _send_protocol_json(payload)
                        # Hand control back to UI as soon as next inputs are requested.
                        # This prevents extra generator yields from leaking past an input boundary.
                        if isinstance(payload, dict) and (
                            payload.get("next_inputs") is not None
                            or payload.get("done") is True
                        ):
                            try:
                                result.close()
                            except Exception:
                                pass
                            break
                else:
                    _send_protocol_json(result or {})
                # Explicit request boundary marker so Rust can drain exactly one turn.
                _send_protocol_json({_TURN_END_KEY: True})

            except json.JSONDecodeError as e:
                _send_protocol_json({"error": "Invalid JSON", "details": str(e)})
                _send_protocol_json({_TURN_END_KEY: True})
            except Exception as e:
                _send_protocol_json(format_detailed_error(e, "main loop"))
                _send_protocol_json({_TURN_END_KEY: True})

    except Exception as e:
        _send_protocol_json(format_detailed_error(e, "loading handler module"))
        sys.exit(1)
