# MettaModeler Project Documentation

## Overview

MettaModeler is a full-stack application that combines a React frontend, Express backend, and Python Flask simulation service. The application allows users to create, manage, and simulate models with a modern web interface.

## Architecture

The application follows a three-tier architecture:

1. **Frontend (React + Vite)**
   - Built with React and TypeScript
   - Uses Vite for development and building
   - Runs on port 5173 in development mode
   - Communicates with the Express backend via API endpoints

2. **Backend (Express + TypeScript)**
   - Built with Express and TypeScript
   - Handles API requests from the frontend
   - Manages user authentication and data persistence
   - Runs on port 3000
   - Communicates with the Python simulation service

3. **Simulation Service (Python + Flask)**
   - Built with Python and Flask
   - Handles complex simulation logic
   - Runs on port 5050
   - Communicates with the Express backend via HTTP

## Development Setup

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

### Development Workflow

The project uses a development script (`dev.sh`) to start all services:

```bash
./dev.sh
```

This script:
1. Starts the Flask simulation service in the background
2. Waits for Flask to initialize
3. Starts the Express backend and Vite frontend using concurrently

### API Communication

- Frontend → Backend: API requests are proxied from Vite (port 5173) to Express (port 3000)
- Backend → Simulation Service: Express makes HTTP requests to Flask (port 5050)

## Project Structure

```
MettaModeler/
├── client/                 # Frontend React application
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main App component
│   │   └── main.tsx        # Entry point
│   └── index.html          # HTML template
├── server/                 # Express backend
│   ├── auth.ts             # Authentication logic
│   ├── export.ts           # Export functionality
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data storage
│   └── vite.ts             # Vite integration
├── python_sim/             # Python simulation service
│   ├── app.py              # Flask application
│   └── ...                 # Other Python files
├── shared/                 # Shared code between frontend and backend
│   └── schema.ts           # TypeScript schemas
├── dev.sh                  # Development script
├── package.json            # Node.js dependencies
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## Key Components

### Frontend

- **React Query**: Used for data fetching and caching
- **Wouter**: Lightweight router for navigation
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Component library

### Backend

- **Express**: Web framework
- **Passport**: Authentication middleware
- **Express Session**: Session management
- **Drizzle ORM**: Database ORM

### Simulation Service

- **Flask**: Web framework
- **NumPy/SciPy**: Scientific computing libraries

## Development Notes

### Authentication Flow

1. User registers/logs in through the frontend
2. Express backend authenticates the user
3. Session is created and stored
4. Frontend receives user data and stores it in React Query cache

### API Proxy Configuration

In development mode, Vite proxies API requests to the Express backend:

```javascript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

### Environment Variables

- `PORT`: Express server port (default: 3000)
- `PYTHON_SIM_URL`: URL of the Python simulation service (default: http://localhost:5050)
- `PYTHON_SIM_PORT`: Port of the Python simulation service (default: 5050)
- `SESSION_SECRET`: Secret for session encryption (auto-generated if not provided)

## Deployment

For production deployment:

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Start the Python simulation service separately.

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure no other services are using ports 3000, 5050, or 5173
2. **API Proxy Issues**: Check that the Vite proxy configuration is correct
3. **Authentication Problems**: Verify that cookies are being sent with requests

### Debugging

- Frontend: Check browser console and network tab
- Backend: Check Express server logs
- Simulation Service: Check Flask server logs

## Future Improvements

- Implement WebSocket communication for real-time updates
- Add comprehensive testing
- Improve error handling and recovery
- Enhance the simulation capabilities 