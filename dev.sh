#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                           MettaModeler Development                          ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

kill_all() {
    echo -e "${YELLOW}Killing lingering Node, Python, and Vite processes...${NC}"
    pkill -f "node" 2>/dev/null && echo "Killed all node processes." || echo "No node processes running."
    pkill -f "python" 2>/dev/null && echo "Killed all python processes." || echo "No python processes running."
    pkill -f "vite" 2>/dev/null && echo "Killed all vite processes." || echo "No vite processes running."
    sleep 1
}

# Function to start all services
start_all() {
    print_banner
    echo -e "${GREEN}Starting all MettaModeler services...${NC}"
    
    # Start Python service
    echo -e "${YELLOW}Starting Python simulation service...${NC}"
    cd python_sim && ./launch.sh start
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to start Python service${NC}"
        exit 1
    fi
    cd ..
    
    # Start frontend and Express server together
    echo -e "${YELLOW}Starting frontend and Express server...${NC}"
    npm run dev > frontend.log 2>&1 &
    echo $! > frontend.pid
    sleep 2

    print_banner
    echo -e "${GREEN}MettaModeler is now running!${NC}"
    echo -e "${GREEN}Python service: ${YELLOW}http://localhost:5050${NC}"
    echo -e "${GREEN}Frontend: ${YELLOW}http://localhost:5173${NC} (or next available port)"
    echo -e "${GREEN}Server: ${YELLOW}http://localhost:3000${NC}"
    echo -e "${GREEN}Logs:${NC}"
    echo -e "  - Python: ${YELLOW}python_sim/app.log${NC}"
    echo -e "  - Frontend/Express: ${YELLOW}frontend.log${NC}"

    # Check if services are running
    echo -e "${YELLOW}Checking service status...${NC}"
    if lsof -i :5050 | grep LISTEN >/dev/null; then
        echo -e "${GREEN}Python service is running on port 5050${NC}"
    else
        echo -e "${RED}Python service is NOT running on port 5050${NC}"
    fi
    if lsof -i :3000 | grep LISTEN >/dev/null; then
        echo -e "${GREEN}Express server is running on port 3000${NC}"
    else
        echo -e "${RED}Express server is NOT running on port 3000${NC}"
    fi
    if lsof -i :5173 | grep LISTEN >/dev/null; then
        echo -e "${GREEN}Vite frontend is running on port 5173${NC}"
    else
        echo -e "${YELLOW}Vite may be running on a different port. Check above for details.${NC}"
    fi
}

# Function to stop all services
stop_all() {
    echo -e "${YELLOW}Stopping all MettaModeler services...${NC}"
    
    # Stop frontend/Express
    if [ -f "frontend.pid" ]; then
        kill $(cat frontend.pid) 2>/dev/null && echo "Stopped frontend/Express." || echo "Could not stop frontend/Express."
        rm -f frontend.pid
    fi

    # Stop Python service
    cd python_sim && ./launch.sh stop
    cd ..
    
    # Kill any lingering processes
    kill_all
    echo -e "${GREEN}All services stopped${NC}"
}

# Function to restart all services
restart_all() {
    stop_all
    sleep 2
    start_all
}

# Function to show status of all services
show_status() {
    print_banner
    echo -e "${YELLOW}Python service status:${NC}"
    cd python_sim && ./launch.sh status
    cd ..
    
    echo -e "\n${YELLOW}Frontend and server status:${NC}"
    if lsof -i :3000 | grep LISTEN >/dev/null; then
        echo -e "${GREEN}Express: Running on port 3000${NC}"
    else
        echo -e "${RED}Express: Not running${NC}"
    fi
    if lsof -i :5173 | grep LISTEN >/dev/null; then
        echo -e "${GREEN}Vite: Running on port 5173${NC}"
    else
        echo -e "${YELLOW}Vite may be running on a different port.${NC}"
    fi
}

# Main script
print_banner

case "$1" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0 