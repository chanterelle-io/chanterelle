"""
Base handler for ML models that provides communication protocol.
Rust calls this file directly, and this imports user functions from handler_io.py
"""
import json
import sys
import importlib.util
import os
from typing import Any, Dict


def load_user_handler_module(handler_path: str):
    """Load the user's handler_io.py module dynamically."""
    spec = importlib.util.spec_from_file_location("handler_io", handler_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load handler from {handler_path}")
    
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MLModelHandler:
    """
    ML Model Handler that follows SageMaker pattern.
    Imports and calls user's: model_fn, input_fn, predict_fn, output_fn
    """
    
    def __init__(self, handler_module_path: str):
        self.model = None
        self.is_initialized = False
        self.handler_module = load_user_handler_module(handler_module_path)
        
    def initialize(self):
        """Initialize the model using user's model_fn."""
        try:
            if not hasattr(self.handler_module, 'model_fn'):
                return {"status": "error", "error": "Handler must implement model_fn()"}
            
            # Call user's model_fn to load the model
            model_dir = os.path.dirname(self.handler_module.__file__) if hasattr(self.handler_module, '__file__') else '.'
            self.model = self.handler_module.model_fn(model_dir)
            self.is_initialized = True
            
            return {"status": "ready", "message": "Model loaded successfully"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def health_check(self):
        """Check if the model is ready."""
        try:
            if self.model is not None and self.is_initialized:
                return {"pong": True, "status": "ready"}
            else:
                return {"pong": False, "status": "not_ready", "error": "Model not loaded"}
        except Exception as e:
            return {"pong": False, "status": "error", "error": str(e)}

    def handle_request(self, request_data):
        """Process a request using SageMaker-style functions."""
        if not self.is_initialized or self.model is None:
            return {"error": "Model not initialized"}
        
        try:
            # Parse input if it's a string
            if isinstance(request_data, str):
                original_input = json.loads(request_data)
            else:
                original_input = request_data
            
            # Step 1: Transform input (user's input_fn)
            if hasattr(self.handler_module, 'input_fn'):
                processed_input = self.handler_module.input_fn(original_input)
            else:
                processed_input = original_input
            
            # Step 2: Make prediction (user's predict_fn)
            if hasattr(self.handler_module, 'predict_fn'):
                prediction = self.handler_module.predict_fn(processed_input, self.model)
            else:
                return {"error": "Handler must implement predict_fn()"}
            
            # Step 3: Transform output (user's output_fn)
            if hasattr(self.handler_module, 'output_fn'):
                result = self.handler_module.output_fn(prediction, original_input)
            else:
                result = prediction
            
            return result
            
        except Exception as e:
            return {"error": str(e)}

    def run_communication_loop(self):
        """Run the main communication loop for stdin/stdout protocol."""
        # Initialize model
        init_result = self.initialize()
        if init_result["status"] != "ready":
            print(json.dumps(init_result), file=sys.stderr)
            sys.exit(1)
        
        print("Model ready. Enter JSON requests (one per line):", file=sys.stderr)
        
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            
            # Handle health check ping
            if line == '{"ping": true}':
                result = self.health_check()
                print(json.dumps(result), flush=True)
                continue
            
            # Process regular requests
            result = self.handle_request(line)
            print(json.dumps(result), flush=True)


if __name__ == "__main__":
    # Get the user's handler file path from command line argument
    if len(sys.argv) < 2:
        print("Error: handler_io.py path required as argument", file=sys.stderr)
        sys.exit(1)
    
    handler_path = sys.argv[1]
    if not os.path.exists(handler_path):
        print(f"Error: Handler file not found: {handler_path}", file=sys.stderr)
        sys.exit(1)
    
    # Create and run the handler
    try:
        handler = MLModelHandler(handler_path)
        handler.run_communication_loop()
    except Exception as e:
        print(f"Error: Failed to initialize handler: {e}", file=sys.stderr)
        sys.exit(1)
