#!/bin/bash
#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}================================${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Check if API is running
check_api() {
    API_URL="${API_BASE_URL:-http://localhost:9009/api/v1/oopsly}"
    echo "Checking API availability at $API_URL..."
    
    if curl -s -f "$API_URL/decks" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is available${NC}"
        return 0
    else
        print_warning "API is not responding. Tests may fail."
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    if ! command -v pytest &> /dev/null; then
        print_error "pytest not found. Install with: pip install -r config/requirement.txt"
        exit 1
    fi
    
    pytest tests/integration/ -v --tb=short || {
        print_error "Integration tests failed"
        return 1
    }
    
    echo -e "${GREEN}✓ Integration tests passed${NC}"
}

# Run performance tests with k6
run_k6_tests() {
    print_header "Running k6 Performance Tests"
    
    if ! command -v k6 &> /dev/null; then
        print_error "k6 not found. Install from: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    TEST_TYPE="${1:-baseline}"
    
    case "$TEST_TYPE" in
        baseline)
            echo "Running baseline load test (30 minutes)..."
            k6 run tests/perf/k6/baseline_load_test.js
            ;;
        stress)
            echo "Running stress test (32 minutes)..."
            k6 run tests/perf/k6/stress_test.js
            ;;
        spike)
            echo "Running spike test (7 minutes)..."
            k6 run tests/perf/k6/spike_test.js
            ;;
        soak)
            echo "Running soak test (4 hours)..."
            k6 run tests/perf/k6/soak_test.js
            ;;
        smoke)
            echo "Running smoke test (1 minute)..."
            k6 run tests/perf/k6/baseline_load_test.js --duration 1m --vus 10
            ;;
        *)
            print_error "Unknown test type: $TEST_TYPE"
            echo "Valid types: baseline, stress, spike, soak, smoke"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Performance tests completed${NC}"
}

# Run Locust tests
run_locust_tests() {
    print_header "Running Locust Performance Tests"
    
    if ! command -v locust &> /dev/null; then
        print_error "Locust not found. Install with: pip install locust"
        exit 1
    fi
    
    USERS="${1:-100}"
    SPAWN_RATE="${2:-10}"
    RUN_TIME="${3:-5m}"
    
    echo "Running Locust test: $USERS users, spawn rate $SPAWN_RATE, duration $RUN_TIME"
    locust -f tests/perf/locustfile.py \
        --host="${API_BASE_URL:-http://localhost:9009/api/v1/oopsly}" \
        --users="$USERS" \
        --spawn-rate="$SPAWN_RATE" \
        --run-time="$RUN_TIME" \
        --headless
    
    echo -e "${GREEN}✓ Locust tests completed${NC}"
}

# Start Docker services
start_docker() {
    print_header "Starting Docker Services"
    ./setup_test_environment.sh up
}

# Stop Docker services
stop_docker() {
    print_header "Stopping Docker Services"
    ./setup_test_environment.sh down
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    docker-up                Start Docker services (API + Database + Redis)
    docker-down              Stop Docker services
    integration              Run integration tests (auto-starts Docker if USE_DOCKER=true)
    performance [TYPE]       Run k6 performance tests
                            Types: baseline, stress, spike, soak, smoke
    locust [USERS] [RATE]   Run Locust performance tests
    all                      Run all tests (integration + smoke)
    check                    Check if API is available

Examples:
    $0 docker-up                      # Start Docker services
    $0 integration                    # Run integration tests (Docker auto-managed)
    $0 performance baseline           # Run baseline load test
    $0 performance smoke              # Run quick smoke test
    $0 locust 100 10                  # Run Locust with 100 users
    $0 all                            # Run all tests
    $0 docker-down                    # Stop Docker services

Environment Variables:
    API_BASE_URL                      # API base URL (default: http://localhost:9009/api/v1/oopsly)
    TARGET_RPS                        # Target requests per second for k6 tests
    USE_DOCKER                        # Auto-start Docker for tests (default: true)
    DOCKER_STARTUP_TIMEOUT            # Max wait time for Docker startup (default: 120s)

Docker Integration:
    By default, integration tests automatically start Docker services.
    Set USE_DOCKER=false to test against a manually running server.
    
    With Docker (automatic):
        $0 integration
    
    Without Docker (manual server):
        USE_DOCKER=false $0 integration

EOF
}

# Main script
main() {
    COMMAND="${1:-help}"
    
    case "$COMMAND" in
        docker-up)
            start_docker
            ;;
        docker-down)
            stop_docker
            ;;
        integration)
            # Docker is auto-managed by pytest fixtures if USE_DOCKER=true
            run_integration_tests
            ;;
        performance)
            check_api || exit 1
            run_k6_tests "${2:-baseline}"
            ;;
        locust)
            check_api || exit 1
            run_locust_tests "${2:-100}" "${3:-10}" "${4:-5m}"
            ;;
        all)
            run_integration_tests
            check_api || exit 1
            run_k6_tests smoke
            ;;
        check)
            check_api
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

main "$@"
