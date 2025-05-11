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

# Function to start all services
start_all() {
    echo -e "${GREEN}Starting all MettaModeler services...${NC}"
    
    # Start Python service
    echo -e "${YELLOW}Starting Python simulation service...${NC}"
    cd python_sim && ./launch.sh start
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to start Python service${NC}"
        exit 1
    fi
    cd ..
    
    # Start frontend and server services
    echo -e "${YELLOW}Starting frontend and server services...${NC}"
    npm run dev > frontend.log 2>&1 &
    echo $! > frontend.pid

    # Start Express server
    echo -e "${YELLOW}Starting Express server...${NC}"
    npx ts-node server/index.ts > express.log 2>&1 &
    echo $! > express.pid
    
    # Print status banner
    print_banner
    echo -e "${GREEN}MettaModeler is now running!${NC}"
    echo -e "${GREEN}Python service: ${YELLOW}http://localhost:5050${NC}"
    echo -e "${GREEN}Frontend: ${YELLOW}http://localhost:5173${NC}"
    echo -e "${GREEN}Server: ${YELLOW}http://localhost:3000${NC}"
    echo -e "${GREEN}Logs:${NC}"
    echo -e "  - Python: ${YELLOW}python_sim/app.log${NC}"
    echo -e "  - Frontend: ${YELLOW}frontend.log${NC}"
    echo -e "  - Express: ${YELLOW}express.log${NC}"
}

# Function to stop all services
stop_all() {
    echo -e "${YELLOW}Stopping all MettaModeler services...${NC}"
    
    # Stop frontend and server services
    if [ -f "frontend.pid" ]; then
        kill $(cat frontend.pid) 2>/dev/null
        rm -f frontend.pid
    fi

    # Stop Express server
    if [ -f "express.pid" ]; then
        kill $(cat express.pid) 2>/dev/null
        rm -f express.pid
    fi
    
    # Stop Python service
    cd python_sim && ./launch.sh stop
    cd ..
    
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
    if [ -f "frontend.pid" ]; then
        echo -e "${GREEN}Frontend: Running${NC}"
    else
        echo -e "${RED}Frontend: Not running${NC}"
    fi
    if [ -f "express.pid" ]; then
        echo -e "${GREEN}Express: Running${NC}"
    else
        echo -e "${RED}Express: Not running${NC}"
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