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

- For detailed architecture and conventions, see [docs/architecture.md](docs/architecture.md).
- For project-level details, see [PROJECT.md](PROJECT.md).

## Schema-First & Codegen Workflow

MettaModeler uses a schema-first, codegen-driven workflow:
- **Single Source of Truth:** All core data models are defined in `/schemas` as versioned JSON-Schema files (e.g., `User.v1.json`, `Project.v1.json`, `Model.v1.json`, `Scenario.v1.json`).
- **Generated Types:** TypeScript types, Zod schemas, and Python Pydantic models are automatically generated from JSON Schema.
- **To update all types after a schema change:**
  ```sh
  npm run codegen:all
  ```
  Or individually:
  ```sh
  npm run codegen:ts   # TypeScript types
  npm run codegen:zod  # Zod validation schemas
  npm run codegen:py   # Python Pydantic models
  ```
- **Generated files are in:**
  - `server/types/generated/*.v1.ts` - TypeScript types
  - `server/types/generated/*.v1.zod.ts` - Zod schemas
  - `python_sim/schemas/*_v1.py` - Python Pydantic models
- **Important:** Always commit generated files. CI will fail if you forget to update generated files after schema changes.
- See [docs/architecture.md](docs/architecture.md) for full details.

## License

MIT 