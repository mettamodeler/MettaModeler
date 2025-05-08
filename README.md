# MettaModeler

A full-stack application for creating, managing, and simulating models with a modern web interface.

## Quick Start

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development environment:

```bash
./dev.sh start
```

This will start:
- Python simulation service on port 5050
- Vite frontend on port 5173

Visit http://localhost:5173 in your browser to access the application.

### Launcher System

MettaModeler includes a robust launcher system for managing services:

```bash
# Start all services
./dev.sh start

# Stop all services
./dev.sh stop

# Restart all services
./dev.sh restart

# Check service status
./dev.sh status
```

For more details on the launcher system, see [LAUNCHER.md](LAUNCHER.md).

## Project Structure

- `client/`: React frontend
- `server/`: Express backend
- `python_sim/`: Python simulation service
- `shared/`: Shared code between frontend and backend

## Documentation

For detailed documentation, see [PROJECT.md](PROJECT.md).

## License

MIT 