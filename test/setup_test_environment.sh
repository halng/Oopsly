#!/bin/bash
#
# Integration Test Environment Setup Script
# Manages Docker containers for running integration tests against a real API server
#
# Usage:
#   ./setup_test_environment.sh up     # Start services
#   ./setup_test_environment.sh down   # Stop services
#   ./setup_test_environment.sh logs   # View logs
#   ./setup_test_environment.sh status # Check status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.test.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    log_success "Docker is available"
}

start_services() {
    log_info "Starting integration test environment..."
    
    # Check if .env file exists in api directory
    if [ ! -f "$SCRIPT_DIR/../api/.env" ]; then
        log_warning ".env file not found in api directory"
        log_info "Creating .env from .env.example..."
        cp "$SCRIPT_DIR/../api/.env.example" "$SCRIPT_DIR/../api/.env"
        log_success "Created .env file (you may need to configure it)"
    fi
    
    # Pull latest images
    log_info "Pulling Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build API image
    log_info "Building API server image..."
    docker-compose -f "$COMPOSE_FILE" build
    
    # Start services
    log_info "Starting services (this may take a few minutes)..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    wait_for_health
    
    log_success "All services are running and healthy!"
    log_info "API Server: http://localhost:9009"
    log_info "PostgreSQL: localhost:5433"
    log_info "Redis: localhost:6380"
    echo ""
    log_info "Run integration tests with: pytest tests/integration/ -v"
}

wait_for_health() {
    local max_wait=120
    local elapsed=0
    local interval=5
    
    while [ $elapsed -lt $max_wait ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy"; then
            log_warning "Some services are unhealthy. Waiting..."
        elif docker-compose -f "$COMPOSE_FILE" ps | grep -q "starting"; then
            log_info "Services are starting..."
        else
            # Check if API is responding
            if curl -s http://localhost:9009/actuator/health > /dev/null 2>&1; then
                return 0
            fi
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    echo ""
    log_error "Services did not become healthy in time. Check logs with: ./setup_test_environment.sh logs"
    return 1
}

stop_services() {
    log_info "Stopping integration test environment..."
    docker-compose -f "$COMPOSE_FILE" down
    log_success "Services stopped"
}

view_logs() {
    log_info "Viewing service logs (Ctrl+C to exit)..."
    docker-compose -f "$COMPOSE_FILE" logs -f
}

check_status() {
    log_info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # Check API health
    if curl -s http://localhost:9009/actuator/health > /dev/null 2>&1; then
        log_success "API Server is responding"
    else
        log_warning "API Server is not responding"
    fi
}

restart_services() {
    log_info "Restarting services..."
    stop_services
    start_services
}

clean_volumes() {
    log_warning "This will remove all volumes and data. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Removing volumes..."
        docker-compose -f "$COMPOSE_FILE" down -v
        log_success "Volumes removed"
    else
        log_info "Cancelled"
    fi
}

# Main command handler
case "${1:-}" in
    up|start)
        check_docker
        start_services
        ;;
    down|stop)
        stop_services
        ;;
    restart)
        check_docker
        restart_services
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    clean)
        clean_volumes
        ;;
    *)
        echo "Integration Test Environment Manager"
        echo ""
        echo "Usage: $0 {up|down|restart|logs|status|clean}"
        echo ""
        echo "Commands:"
        echo "  up      - Start all services (API, PostgreSQL, Redis)"
        echo "  down    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - View service logs"
        echo "  status  - Check service status"
        echo "  clean   - Remove all volumes and data"
        echo ""
        echo "Example:"
        echo "  $0 up              # Start services"
        echo "  pytest tests/integration/ -v  # Run tests"
        echo "  $0 down            # Stop services"
        exit 1
        ;;
esac
