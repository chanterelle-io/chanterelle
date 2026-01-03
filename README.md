# Chanterelle

Chanterelle is a desktop application to make easy user interfaces about your ML models.

- Documentation: https://chanterelle.io

## Why Chanterelle?

Chanterelle is built for **managing** a library of local ML projects, solving common friction points in ML development.

### 1. The "Baseline vs. Challenger" Workflow
Switching between models usually requires killing servers and swapping Python environments. Chanterelle acts as a **Unified Launcher**, managing environments (Conda/Venv) for you. This allows instant switching between a "V1 Production" model (e.g., TensorFlow 1.x) and a "V2 Experimental" model (e.g., PyTorch 2.x) to compare outputs side-by-side without the "terminal dance."

### 2. Static Reports as First-Class Citizens
Often, the "report" is buried inside the application code. Chanterelle treats **Model Insights** as data (JSON). This allows you to version control, archive, and view static reports (training curves, confusion matrices) without needing to "run" the model code.

### 3. Production-Ready by Design
Chanterelle enforces a strict separation between UI and Logic. Your Python code must be "headless" (input -> predict -> output), similar to SageMaker. This prevents "spaghetti code" where logic gets trapped in UI callbacks, ensuring your models are ready for cloud deployment from day one.

## Development & Contributing

- Developer guide: [README.dev.md](README.dev.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)