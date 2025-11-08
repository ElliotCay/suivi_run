#!/bin/bash

# Script to start both frontend and backend servers

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Suivi Run application...${NC}\n"

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting backend server...${NC}"
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}Both servers are starting!${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:8000"
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "\nPress Ctrl+C to stop both servers\n"

# Wait for both processes
wait
