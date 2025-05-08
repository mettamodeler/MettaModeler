# MettaModeler Python Simulation Engine

A robust, extensible simulation backend for Fuzzy Cognitive Maps (FCMs), powering advanced scenario modeling, network analysis, and reproducible research workflows.

---

## Table of Contents
- [Features](#features)
- [Data Contracts & Validation](#data-contracts--validation)
- [Setup](#setup)
- [Running the Simulation Service](#running-the-simulation-service)
- [API Endpoints](#api-endpoints)
  - [/api/simulate (POST)](#apisimulate-post)
  - [/api/analyze (POST)](#apianalyze-post)
  - [/api/export/notebook (POST)](#apiexportnotebook-post)
  - [/api/export/excel (POST)](#apiexportexcel-post)
  - [/api/health (GET)](#apihealth-get)
- [Data Model](#data-model)
- [Testing](#testing)
- [Contributing](#contributing)
- [Deployment & Production](#deployment--production)
- [License](#license)

---

## Features
- Advanced FCM simulation using NumPy and NetworkX
- Multiple activation functions (sigmoid, tanh, relu)
- Scenario comparison and impact metrics
- Network structure analysis and centrality
- Jupyter Notebook and Excel export
- RESTful API endpoints
- Robust data validation with Pydantic

## Data Contracts & Validation
- **Single Source of Truth:** All API requests and responses are validated using [Pydantic](https://pydantic-docs.helpmanual.io/) models in [`simulation_schema.py`](./simulation_schema.py).
- Any changes to API payloads (e.g., simulation input, scenario comparison) must be made in the Pydantic models.
- This ensures consistency, type safety, and clear validation for all API consumers (frontend, scripts, etc.).

## Setup
### Prerequisites
- Python 3.7+
- pip (Python package manager)

### Installation
Run the setup script to install all required dependencies:
```bash
./setup.sh
```
Or install dependencies manually:
```bash
pip install numpy networkx matplotlib pandas seaborn nbformat flask flask-cors
```

## Running the Simulation Service
Start the Flask server:
```bash
python app.py
```
This will start the service on port 5050 by default (configurable via `PYTHON_SIM_PORT`).

## API Endpoints

### `/api/simulate` (POST)
Run an FCM simulation or scenario comparison.

**Request body:**
```json
{
  "nodes": [{ "id": "n1", "data": { "value": 0.5, "type": "driver", "label": "Node 1" } }],
  "edges": [{ "source": "n1", "target": "n2", "data": { "weight": 0.7 } }],
  "activation": "sigmoid",
  "threshold": 0.001,
  "maxIterations": 100,
  "compareToBaseline": false,
  "clampedNodes": ["n1"]
}
```
**Response:**
```json
{
  "timeSeries": { "n1": [0.5, 0.52, ...], "n2": [0.0, 0.35, ...] },
  "finalState": { "n1": 0.53, "n2": 0.67 },
  "iterations": 12,
  "converged": true
}
```

### `/api/analyze` (POST)
Analyze the structure and centrality of an FCM model.

**Request body:**
```json
{
  "nodes": [{ "id": "n1", "data": { "value": 0.5, "type": "driver", "label": "Node 1" } }],
  "edges": [{ "source": "n1", "target": "n2", "data": { "weight": 0.7 } }]
}
```
**Response:**
```json
{
  "nodeCount": 2,
  "edgeCount": 1,
  "density": 0.5,
  "isConnected": true,
  "hasLoop": false,
  "centrality": {
    "degree": { "n1": 0.5, "n2": 0.5 },
    "inDegree": { "n1": 0, "n2": 1 },
    "outDegree": { "n1": 1, "n2": 0 },
    "betweenness": { "n1": 0, "n2": 0 },
    "closeness": { "n1": 0.5, "n2": 0.5 }
  },
  "adjacencyMatrix": [[0, 0.7], [0, 0]],
  "nodeIds": ["n1", "n2"]
}
```

### `/api/export/notebook` (POST)
Export a model, scenario, or analysis as a Jupyter notebook.

**Request body:**
```json
{
  "data": { ... },
  "type": "model", // or "scenario", "analysis", "comparison"
  "modelId": 123,
  "scenarioId": 456,
  "comparisonScenarioId": 789
}
```
**Response:**
- Returns a downloadable `.ipynb` file.

### `/api/export/excel` (POST)
Export a model, scenario, or analysis as an Excel file.

**Request body:**
```json
{
  "data": { ... },
  "type": "model", // or "scenario", "analysis"
  "fileName": "export.xlsx"
}
```
**Response:**
- Returns a downloadable `.xlsx` file.

### `/api/health` (GET)
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Data Model
### Node
- `id` (str, required): Unique node identifier
- `label` (str, optional): Human-readable label
- `value` (float, required): Initial activation value
- `type` (str, optional): Node type (e.g., "driver", "output", "regular")

### Edge
- `source` (str, required): Source node ID
- `target` (str, required): Target node ID
- `weight` (float, required): Edge weight

See [`simulation_schema.py`](./simulation_schema.py) for full details and validation rules.

## Testing
- To run tests (if present):
```bash
python -m unittest test_excel.py
python -m unittest test_excel_server.py
```
- Ensure all tests pass before deploying or submitting a PR.

## Contributing
- All API contracts are defined in Pydantic models—**never change request/response structure without updating the schema**.
- Use clear, descriptive commit messages.
- Follow PEP8 for Python code style.
- Open issues or pull requests for discussion before major changes.
- Add/expand docstrings for all new functions and classes.

## Deployment & Production
- The default port is 5050 (set `PYTHON_SIM_PORT` to override).
- For production, use a WSGI server (e.g., gunicorn) and set `debug=False`.
- Restrict CORS in `app.py` if deploying to a public environment.
- Monitor logs for errors and performance issues.

## License
MIT License. See [LICENSE](../LICENSE) for details.