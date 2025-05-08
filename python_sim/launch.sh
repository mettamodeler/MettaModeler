#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PORT=5050
LOG_FILE="app.log"
PID_FILE="app.pid"
MAX_RETRIES=3
RETRY_DELAY=2

# Function to check if a process is running on a port
check_port() {
    lsof -i :$PORT > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port_process() {
    if check_port; then
        echo -e "${YELLOW}Found process running on port $PORT. Attempting to kill...${NC}"
        lsof -ti :$PORT | xargs kill -9 2>/dev/null
        sleep 1
        if check_port; then
            echo -e "${RED}Failed to kill process on port $PORT${NC}"
            return 1
        else
            echo -e "${GREEN}Successfully killed process on port $PORT${NC}"
            return 0
        fi
    fi
    return 0
}

# Function to check Python service health
check_health() {
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s http://localhost:$PORT/api/health > /dev/null; then
            echo -e "${GREEN}Python service is healthy${NC}"
            return 0
        fi
        echo -e "${YELLOW}Waiting for service to become healthy (attempt $((retries + 1))/$MAX_RETRIES)...${NC}"
        sleep $RETRY_DELAY
        retries=$((retries + 1))
    done
    echo -e "${RED}Service failed to become healthy after $MAX_RETRIES attempts${NC}"
    return 1
}

# Function to start the Python service
start_service() {
    echo -e "${GREEN}Starting Python simulation service...${NC}"
    
    # Ensure we're in the correct directory
    cd "$(dirname "$0")"
    
    # Kill any existing process
    kill_port_process || exit 1
    
    # Start the service with proper logging
    nohup python app.py > $LOG_FILE 2>&1 &
    
    # Save PID
    echo $! > $PID_FILE
    
    # Wait for service to start
    sleep 2
    
    # Check if process is still running
    if ! ps -p $(cat $PID_FILE) > /dev/null; then
        echo -e "${RED}Service failed to start. Check $LOG_FILE for details${NC}"
        exit 1
    fi
    
    # Check health
    check_health || exit 1
    
    echo -e "${GREEN}Python service started successfully on port $PORT${NC}"
    echo -e "${GREEN}Logs available at: $LOG_FILE${NC}"
    echo -e "${GREEN}PID file: $PID_FILE${NC}"
}

# Function to stop the service
stop_service() {
    if [ -f "$PID_FILE" ]; then
        echo -e "${YELLOW}Stopping Python service...${NC}"
        kill $(cat $PID_FILE) 2>/dev/null
        rm -f $PID_FILE
        kill_port_process
        echo -e "${GREEN}Service stopped${NC}"
    else
        echo -e "${YELLOW}No PID file found. Attempting to kill process on port $PORT...${NC}"
        kill_port_process
    fi
}

# Function to show service status
show_status() {
    if check_port; then
        echo -e "${GREEN}Service is running on port $PORT${NC}"
        if [ -f "$PID_FILE" ]; then
            echo -e "PID: $(cat $PID_FILE)"
        fi
        if check_health; then
            echo -e "Health: ${GREEN}OK${NC}"
        else
            echo -e "Health: ${RED}ERROR${NC}"
        fi
    else
        echo -e "${RED}Service is not running${NC}"
    fi
}

# Main script
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 2
        start_service
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