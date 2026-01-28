import json
import time

def initialize():
    """
    Called when the interactive session starts (or when history is empty).
    Returns the initial greeting and the first form.
    """
    return {
        "outputs": [
            {
                "type": "section",
                "id": "intro",
                "title": "Welcome",
                "items": [
                    {
                        "type": "text",
                        "id": "msg1",
                        "title": "Hello",
                        "content": [
                            {
                                "type": "paragraph",
                                "text": "Welcome to the Interactive Demo! I am a Python agent running in the background."
                            },
                            {
                                "type": "paragraph",
                                "text": "Please tell me your name to get started."
                            }
                        ]
                    }
                ]
            }
        ],
        "next_inputs": [
            {
                "name": "username",
                "label": "Your Name",
                "type": "string",
                "constraints": {
                    "placeholder": "Alice"
                }
            }
        ]
    }

def on_input(data):
    """
    Called when the user submits a form.
    'data' contains the dictionary of inputs from the last form.
    """
    
    # 1. Check what state we are in based on inputs provided
    if "username" in data:
        name = data["username"]
        return {
            "outputs": [
                {
                    "type": "section",
                    "title": "Greeting",
                    "items": [
                        {
                            "type": "text",
                            "id": "greet",
                            "title": f"Hi {name}",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "text": f"Nice to meet you, {name}! Now, send me a message and I will echo it back with some analysis."
                                }
                            ]
                        }
                    ]
                }
            ],
            "next_inputs": [
                {
                    "name": "message",
                    "label": "Your Message",
                    "type": "textarea",
                    "constraints": {
                        "placeholder": "Type something..."
                    }
                },
                {
                    "name": "should_plot",
                    "label": "Show Analysis Chart?",
                    "type": "boolean",
                    "default": True
                }
            ]
        }
        
    # 2. Handle Message Loop
    message = data.get("message", "Nothing")
    show_plot = data.get("should_plot", False)
    
    outputs = [
        {
            "type": "section",
            "title": "Reply",
            "items": [
                {
                    "type": "text",
                    "id": "reply_txt",
                    "title": "Echo",
                    "content": [
                        { "type": "paragraph", "text": f"You said: {message}" },
                        { "type": "paragraph", "text": f"Character count: {len(message)}" }
                    ]
                }
            ]
        }
    ]
    
    if show_plot:
        # Add a Plotly chart
        outputs[0]["items"].append({
            "type": "plotly",
            "id": "chart1",
            "title": "Message Analysis",
            "data": [
                 {
                    "x": ["Chars", "Words"],
                    "y": [len(message), len(message.split())],
                    "type": "bar",
                    "name": "Counts"
                }
            ],
            "layout": {
                "title": "Message Statistics",
                "height": 300
            }
        })

    return {
        "outputs": outputs,
        "next_inputs": [
            {
                "name": "message",
                "label": "Next Message",
                "type": "textarea"
            },
            {
                "name": "should_plot",
                "label": "Show Chart",
                "type": "boolean",
                "default": show_plot
            }
        ]
    }
