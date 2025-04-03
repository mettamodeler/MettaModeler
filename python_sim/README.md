# MettaModeler Python Simulation Engine

This directory contains the Python-based simulation engine for MettaModeler, which provides advanced simulation capabilities for Fuzzy Cognitive Maps (FCMs).

## Features

- Advanced FCM simulation using NumPy and NetworkX
- Multiple activation functions (sigmoid, tanh, relu)
- Network structure analysis
- Jupyter Notebook export
- Centrality measures and network metrics
- RESTful API endpoints

## Setup

### Prerequisites

- Python 3.6+
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

This will start the service on port 5050 by default.

## API Endpoints

### `/api/simulate` (POST)

Run an FCM simulation with the provided model.

**Request body:**
```json
{
  "nodes": [{ "id": "n1", "data": { "value": 0.5, "type": "driver", "label": "Node 1" } }],
  "edges": [{ "source": "n1", "target": "n2", "data": { "weight": 0.7 } }],
  "activation": "sigmoid",
  "threshold": 0.001,
  "maxIterations": 100,
  "generateNotebook": false
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

Analyze the structure of an FCM model.

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

### `/api/health` (GET)

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```