# Interactive Project Reference

Interactive projects enable multi-turn conversational agents with dynamic forms and rich output.

## interactive.json Schema

```json
{
  "interactive_name": "Agent Display Name",
  "version": "1.0.0",
  "description": "Detailed description",
  "description_short": "Brief for catalog card",
  "tags": {"type": "demo", "domain": "nlp"},
  "python_environment": {"type": "system"}
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `interactive_name` | Yes | Name in catalog and page header |
| `version` | No | Version string |
| `description` | No | Detailed description |
| `description_short` | No | Short text for catalog card |
| `tags` | No | Key-value categorization |
| `python_environment` | No | Python env config: `system`, `venv`, `conda`, `virtualenv` |

## handler_io.py

Interactive handlers implement 2 functions:

```python
def initialize():
    """Called when session starts. Return greeting and first form."""
    return {
        "outputs": [...],       # Sections to display (same as model_findings content)
        "next_inputs": [...]    # Input definitions for the next form
    }

def on_input(data):
    """Called each turn. data = dict of user's input values."""
    return {
        "outputs": [...],       # Sections to display
        "next_inputs": [...]    # Input definitions for the next form
    }
```

### Response Object

| Field | Type | Description |
|-------|------|-------------|
| `outputs` | array | Sections/items — same format as model_findings.json `content`. See [visualization-types.md](./visualization-types.md) |
| `next_inputs` | array | Input definitions — same format as model_meta.json `inputs` (name, label, type, constraints, default) |

### Composer Auto-Detection

Chanterelle picks the input UI automatically:

| next_inputs pattern | UI shown |
|---------------------|----------|
| Single `string` or `textarea` | Chat-style text box |
| Single `button` or `yes_no` | Inline quick-choice buttons |
| Multiple inputs or complex types | Full multi-field form panel |

### State Management

The Python process persists across turns. Use module-level variables for state:

```python
history = []
user_name = None

def initialize():
    global history, user_name
    history = []
    user_name = None
    return {"outputs": [...], "next_inputs": [...]}

def on_input(data):
    global user_name
    history.append(data)
    if "username" in data:
        user_name = data["username"]
    # Use history and user_name for context-aware responses
    return {"outputs": [...], "next_inputs": [...]}
```

## Complete Example: Data Explorer Agent

```python
import json

user_data = None

def initialize():
    return {
        "outputs": [{
            "type": "section",
            "title": "Data Explorer",
            "items": [{
                "type": "text",
                "id": "welcome",
                "content": [{"type": "paragraph", "text": "Upload a CSV to explore your data."}]
            }]
        }],
        "next_inputs": [{
            "name": "dataset",
            "label": "Upload CSV",
            "type": "file",
            "constraints": {"extensions": [".csv"]}
        }]
    }

def on_input(data):
    global user_data
    import pandas as pd

    if "dataset" in data:
        user_data = pd.read_csv(data["dataset"])
        cols = list(user_data.columns)
        return {
            "outputs": [{
                "type": "section",
                "title": "Dataset Loaded",
                "items": [
                    {
                        "type": "table",
                        "title": f"Preview ({len(user_data)} rows)",
                        "data": {
                            "columns": [{"header": c, "field": c} for c in cols],
                            "rows": user_data.head(10).to_dict("records")
                        }
                    }
                ]
            }],
            "next_inputs": [
                {
                    "name": "column",
                    "label": "Column to Analyze",
                    "type": "category",
                    "constraints": {"options": cols}
                }
            ]
        }

    if "column" in data and user_data is not None:
        col = data["column"]
        stats = user_data[col].describe()
        return {
            "outputs": [{
                "type": "section",
                "title": f"Analysis: {col}",
                "items": [
                    {
                        "type": "table",
                        "title": "Statistics",
                        "data": {
                            "columns": [
                                {"header": "Metric", "field": "metric"},
                                {"header": "Value", "field": "value"}
                            ],
                            "rows": [{"metric": k, "value": str(v)} for k, v in stats.items()]
                        }
                    },
                    {
                        "type": "plotly",
                        "title": f"Distribution of {col}",
                        "data": [{"x": user_data[col].dropna().tolist(), "type": "histogram"}],
                        "layout": {"title": col, "height": 350}
                    }
                ]
            }],
            "next_inputs": [
                {
                    "name": "column",
                    "label": "Analyze Another Column",
                    "type": "category",
                    "constraints": {"options": list(user_data.columns)}
                }
            ]
        }

    return {
        "outputs": [{"type": "section", "title": "Error", "items": [{"type": "error", "error": "Unexpected state"}]}],
        "next_inputs": [{"name": "message", "label": "Message", "type": "string"}]
    }
```
