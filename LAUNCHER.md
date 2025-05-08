# MettaModeler Launcher System

This document explains how to use the MettaModeler launcher system for managing the development environment.

## Overview

The MettaModeler launcher system consists of three main scripts:

1. `dev.sh` - The main launcher script that manages all services
2. `python_sim/launch.sh` - Manages the Python simulation service
3. `client/launch.sh` - Manages the frontend service

## Main Launcher (`dev.sh`)

The main launcher script provides a unified interface for managing all MettaModeler services.

### Usage

```bash
./dev.sh {start|stop|restart|status}
```

- `start` - Start all services (Python and frontend)
- `stop` - Stop all services
- `restart` - Restart all services
- `status` - Check the status of all services

### Example

```bash
# Start all services
./dev.sh start

# Check status
./dev.sh status

# Restart all services
./dev.sh restart

# Stop all services
./dev.sh stop
```

## Python Service Launcher (`python_sim/launch.sh`)

The Python service launcher manages the Python simulation service that runs on port 5050.

### Usage

```bash
cd python_sim
./launch.sh {start|stop|restart|status}
```

- `start` - Start the Python service
- `stop` - Stop the Python service
- `restart` - Restart the Python service
- `status` - Check the status of the Python service

### Example

```bash
cd python_sim
./launch.sh start
```

## Frontend Service Launcher (`client/launch.sh`)

The frontend service launcher manages the frontend service that runs on port 5173.

### Usage

```bash
cd client
./launch.sh {start|stop|restart|status}
```

- `start` - Start the frontend service
- `stop` - Stop the frontend service
- `restart` - Restart the frontend service
- `status` - Check the status of the frontend service

### Example

```bash
cd client
./launch.sh start
```

## Features

The launcher system provides the following features:

- **Process Management**: Automatically kills any existing processes on the required ports
- **Health Checks**: Verifies that services are running correctly
- **Logging**: Captures output to log files for debugging
- **PID Tracking**: Keeps track of process IDs for proper shutdown
- **Error Handling**: Provides clear error messages and handles failures gracefully

## Log Files

- Python service logs: `python_sim/app.log`
- Frontend service logs: `client/frontend.log`

## Troubleshooting

If you encounter issues with the launcher system:

1. Check the log files for error messages
2. Make sure no other processes are using the required ports (5050 and 5173)
3. Try stopping all services with `./dev.sh stop` and then starting them again with `./dev.sh start`
4. If a service fails to start, check the corresponding log file for details

## Future Improvements

Planned improvements for the launcher system:

- Add retries for frontend startup
- Add log rotation
- Add port configurability via .env 