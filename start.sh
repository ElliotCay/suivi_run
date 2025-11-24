#!/bin/bash
set -euo pipefail

# Script to start both frontend and backend servers
# Script to start both frontend and backend servers

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STATE_DIR="${TMPDIR:-/tmp}/suivi_run"
mkdir -p "${STATE_DIR}"

PIDS=()

stop_from_pidfile() {
    local name=$1
    local pid_file="${STATE_DIR}/${name}.pid"

    if [[ ! -f "${pid_file}" ]]; then
        return
    fi

    local pid
    pid=$(cat "${pid_file}" 2>/dev/null || true)
    if [[ -z "${pid}" ]]; then
        rm -f "${pid_file}"
        return
    fi

    print_manual_kill "${pid}" "" "${name}"
    if kill -0 "${pid}" 2>/dev/null; then
        echo -e "${BLUE}Stopping previous ${name} process (PID ${pid})...${NC}"
        pkill -P "${pid}" 2>/dev/null || true
        kill "${pid}" 2>/dev/null || true
        sleep 1
        if kill -0 "${pid}" 2>/dev/null; then
            kill -9 "${pid}" 2>/dev/null || true
            pkill -9 -P "${pid}" 2>/dev/null || true
            sleep 1
        fi
        if kill -0 "${pid}" 2>/dev/null; then
            echo -e "${BLUE}Previous ${name} process (${pid}) is still running. Please stop it manually and rerun.${NC}"
            print_manual_kill "${pid}" "" "${name}"
            exit 1
        fi
    fi

    rm -f "${pid_file}"
}

require_port_free() {
    local port=$1
    local label=$2

    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids=$(lsof -ti tcp:"${port}" || true)
        if [[ -n "${pids}" ]]; then
            echo -e "${BLUE}Port ${port} is already in use for ${label} (PIDs: ${pids}). Stop these processes and rerun the script.${NC}"
            print_manual_kill "${pids}" "${port}" "${label}"
            exit 1
        fi
    else
        echo -e "${BLUE}lsof not found; cannot pre-check port ${port} for ${label}.${NC}"
    fi
}

print_manual_kill() {
    local pids="$1"
    local port="$2"
    local label="$3"

    if [[ -n "${pids}" ]]; then
        echo -e "${BLUE}To stop ${label:-process}, run:${NC} kill -9 ${pids}"
    fi
    if [[ -n "${port}" ]]; then
        echo -e "${BLUE}To inspect the port, run:${NC} lsof -i tcp:${port}"
    fi
}

echo -e "${BLUE}Starting Suivi Run application...${NC}\n"

cleanup() {
    if [[ "${CLEANED_UP:-0}" -eq 1 ]]; then
        return
    fi
    CLEANED_UP=1

    echo -e "\n${BLUE}Shutting down servers...${NC}"
    for pid in "${PIDS[@]-}"; do
        if kill -0 "$pid" 2>/dev/null; then
            pkill -P "$pid" 2>/dev/null || true
            kill "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
        fi
    done

    rm -f "${STATE_DIR}/backend.pid" "${STATE_DIR}/frontend.pid"
}

trap cleanup EXIT SIGINT SIGTERM

stop_from_pidfile "backend"
require_port_free 8000 "backend"
echo -e "${GREEN}Starting backend server...${NC}"
(cd backend && source venv/bin/activate && exec python main.py) &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")
echo "${BACKEND_PID}" > "${STATE_DIR}/backend.pid"

sleep 2

stop_from_pidfile "frontend"
require_port_free 3000 "frontend"
echo -e "${GREEN}Starting frontend server...${NC}"
(cd frontend && exec npm run dev) &
FRONTEND_PID=$!
PIDS+=("$FRONTEND_PID")
echo "${FRONTEND_PID}" > "${STATE_DIR}/frontend.pid"

echo -e "\n${GREEN}Both servers are starting!${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:8000"
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "\nPress Ctrl+C to stop both servers\n"

wait
