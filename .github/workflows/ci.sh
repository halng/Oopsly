#!/bin/bash
set -e

# CI Script - Unified CI pipeline for Oopsly
# This script consolidates all CI steps from the existing workflows

echo "CI::====================================="
echo "CI::Starting Unified CI Pipeline"
echo "CI::====================================="

# Validate environment by checking tool versions
validate_environment() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Validating Environment"
    echo "CI::====================================="
    
    local validation_failed=false
    
    # Check Java
    echo "CI::Checking Java..."
    if command -v java &> /dev/null; then
        java -version
    else
        echo "CI::ERROR: Java is not installed"
        validation_failed=true
    fi
    
    # Check Gradle wrapper (will be checked in api directory)
    echo "CI::Checking Gradle..."
    if [ -d "api" ] && [ -f "api/gradlew" ]; then
        echo "CI::Gradle wrapper found in api directory"
    else
        echo "CI::WARNING: Gradle wrapper not found in api directory"
    fi
    
    # Check Node.js
    echo "CI::Checking Node.js..."
    if command -v node &> /dev/null; then
        node --version
    else
        echo "CI::ERROR: Node.js is not installed"
        validation_failed=true
    fi
    
    # Check npm
    echo "CI::Checking npm..."
    if command -v npm &> /dev/null; then
        npm --version
    else
        echo "CI::ERROR: npm is not installed"
        validation_failed=true
    fi
    
    # Check Python
    echo "CI::Checking Python..."
    if command -v python &> /dev/null; then
        python --version
    else
        echo "CI::ERROR: Python is not installed"
        validation_failed=true
    fi
    
    # Check pip
    echo "CI::Checking pip..."
    if command -v pip &> /dev/null; then
        pip --version
    else
        echo "CI::ERROR: pip is not installed"
        validation_failed=true
    fi
    
    if [ "$validation_failed" = true ]; then
        echo "CI::"
        echo "CI::ERROR: Environment validation failed. Please install missing dependencies."
        exit 1
    fi
    
    echo "CI::"
    echo "CI::Environment validation completed successfully!"
}

# Backend CI (api directory)
run_backend_ci() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Running Backend CI (api)"
    echo "CI::====================================="
    
    if [ -d "api" ]; then
        cd api
        
        echo "CI::Running Spotless Check..."
        ./gradlew spotlessCheck
        
        echo "CI::Running Unit Tests..."
        ./gradlew test
        
        echo "CI::Running Code Coverage and Verification..."
        ./gradlew jacocoTestCoverageVerification

        echo "CI::Building and Pushing Docker Image..."
        if [ -n "$IMAGE_TAG" ]; then
            echo "CI::Building Docker image with tag: $IMAGE_TAG"
            ./gradlew bootBuildImage --imageName=ghcr.io/halng/oopsly-api:"$IMAGE_TAG"

            echo "CI::Logging to container registry..."
            echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin

            echo "CI::Pushing Docker image to registry..."
            docker push ghcr.io/halng/oopsly-api:"$IMAGE_TAG"

            echo "CI::Docker image ghcr.io/halng/oopsly-api:$IMAGE_TAG built and pushed successfully!"
        else
            echo "CI::No IMAGE_TAG set; skipping Docker image build and push."
        fi
        
        cd ..
        echo "CI::Backend CI completed successfully!"
    else
        echo "CI::Warning: api directory not found, skipping backend CI"
    fi
}

# Frontend CI (ui directory)
run_frontend_ci() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Running Frontend CI (ui)"
    echo "CI::====================================="
    
    if [ -d "ui" ]; then
        cd ui
        
        # Detect package manager
        PKG_MANAGER=""
        echo "CI::Installing packages..."
        if [ -f pnpm-lock.yaml ]; then
            PKG_MANAGER="pnpm"
            npm install -g pnpm
            pnpm install --frozen-lockfile
        elif [ -f yarn.lock ]; then
            PKG_MANAGER="yarn"
            corepack enable
            corepack prepare yarn@stable --activate
            yarn install --frozen-lockfile
        elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
            PKG_MANAGER="npm"
            npm ci
        else
            PKG_MANAGER="npm"
            npm install
        fi
        
        echo "CI::Running ESLint..."
        $PKG_MANAGER run lint
        
        echo "CI::Running Unit Tests with coverage..."
        $PKG_MANAGER run test:coverage
        
        cd ..
        echo "CI::Frontend CI completed successfully!"
    else
        echo "CI::Warning: ui directory not found, skipping frontend CI"
    fi
}

# Markdown Linting
run_markdown_lint() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Running Markdown Linting"
    echo "CI::====================================="
    
    if command -v markdownlint-cli2 &> /dev/null; then
        markdownlint-cli2 '**/*.md'
        echo "CI::Markdown linting completed successfully!"
    else
        echo "CI::Installing markdownlint-cli2..."
        npm install -g markdownlint-cli2
        markdownlint-cli2 '**/*.md'
        echo "CI::Markdown linting completed successfully!"
    fi
}

# Python Test Style Check (test directory)
run_test_style_check() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Running Test Style Check (Python)"
    echo "CI::====================================="
    
    if [ -d "test" ]; then
        echo "CI::Installing Python dependencies..."
        python -m pip install --upgrade pip
        pip install -r test/config/requirement.txt
        
        echo "CI::Running black style check..."
        black --check test/
        
        echo "CI::Test style check completed successfully!"
    else
        echo "CI::Warning: test directory not found, skipping test style check"
    fi
}

# Integration Tests (test directory)
run_integration_tests() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Running Integration Tests"
    echo "CI::====================================="
    
    if [ ! -d "test" ]; then
        echo "CI::Warning: test directory not found, skipping integration tests"
        return 0
    fi
    
    if [ ! -d "api" ]; then
        echo "CI::ERROR: api directory not found"
        return 1
    fi
    
    # Start PostgreSQL and Redis services only
    echo "CI::Starting database and cache services..."
    cd test/tests/config
    docker compose -f docker-compose-integration.yaml up -d postgres redis
    
    # Wait for postgres and redis to be healthy
    echo "CI::Waiting for services to be healthy..."
    timeout=60
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        postgres_status=$(docker compose -f docker-compose-integration.yaml ps postgres --format json 2>/dev/null | grep -o '"Health":"healthy"' || echo "")
        redis_status=$(docker compose -f docker-compose-integration.yaml ps redis --format json 2>/dev/null | grep -o '"Health":"healthy"' || echo "")
        
        if [ -n "$postgres_status" ] && [ -n "$redis_status" ]; then
            echo "CI::Database and cache services are healthy!"
            break
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "CI::ERROR: Services failed to become healthy"
        docker compose -f docker-compose-integration.yaml down
        return 1
    fi
    
    cd ../../..
    
    # Start Spring Boot application with test profile
    echo "CI::Starting Spring Boot application with itest profile..."
    cd api
    
    # Always create .env file with correct test values
    echo "CI::Creating .env file with test configuration..."
    cat > .env << 'EOF'
GOOGLE_CLIENT_ID=dummy.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=dummy
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=oopsly
EMAIL_USERNAME=test@example.com
EMAIL_PASSWORD=dummy
JWT_SECRET=dummysecretkey
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
    
    # Verify .env file was created
    echo "CI::.env file contents:"
    cat .env
    
    # Run bootRun with explicit spring profile argument
    echo "CI::Starting Spring Boot application (logs will be shown below)..."
    ./gradlew bootRun --args='--spring.profiles.active=itest' > /tmp/spring-boot.log 2>&1 &
    BOOT_PID=$!
    echo "CI::Spring Boot started with PID $BOOT_PID"
    
    # Tail logs in background
    tail -f /tmp/spring-boot.log &
    TAIL_PID=$!
    
    # Wait for application to be ready
    echo "CI::Waiting for application to start (checking health endpoint)..."
    timeout=120
    elapsed=0
    app_ready=false
    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:9009/api/v1/oopsly/actuator/health > /dev/null 2>&1; then
            echo "CI::Application is ready!"
            app_ready=true
            break
        fi
        
        # Check if process is still running
        if ! kill -0 $BOOT_PID 2>/dev/null; then
            echo "CI::ERROR: Spring Boot process died"
            break
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    # Stop tailing logs
    kill $TAIL_PID 2>/dev/null || true
    
    if [ "$app_ready" = false ]; then
        echo "CI::ERROR: Application failed to start within timeout"
        kill $BOOT_PID 2>/dev/null || true
        cd ../test/tests/config
        docker compose -f docker-compose-integration.yaml down
        cd ../../..
        return 1
    fi
    
    cd ..
    
    # Run integration tests (skip Docker setup since we're managing it here)
    echo "CI::Executing integration tests..."
    cd test
    
    # Install Python dependencies if not already installed
    echo "CI::Installing Python test dependencies..."
    python -m pip install --upgrade pip
    pip install -r config/requirement.txt
    
    # Set environment variable to skip Docker setup in Python script
    export SKIP_DOCKER_SETUP=true
    python -m tests.integration.main
    TEST_EXIT_CODE=$?
    cd ..
    
    # Cleanup
    echo "CI::Stopping Spring Boot application..."
    kill $BOOT_PID 2>/dev/null || true
    wait $BOOT_PID 2>/dev/null || true
    
    echo "CI::Stopping database and cache services..."
    cd test/tests/config
    docker compose -f docker-compose-integration.yaml down
    cd ../../..
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo "CI::Integration tests completed successfully!"
        return 0
    else
        echo "CI::ERROR: Integration tests failed with exit code $TEST_EXIT_CODE"
        return 1
    fi
}

# Security Scans (Snyk)
run_security_scans() {
    echo "CI::"
    echo "CI::====================================="
    echo "CI::Running Security Scans (Snyk)"
    echo "CI::====================================="
    
    if [ -z "$SNYK_TOKEN" ]; then
        echo "CI::Warning: SNYK_TOKEN not set, skipping security scans"
        return 0
    fi
    
    # Snyk organization ID
    SNYK_ORG_ID="${SNYK_ORG_ID:-a8c77c31-638a-4516-ab03-0e14eb961631}"
    
    echo "CI::Setting up Snyk CLI..."
    curl -sS https://static.snyk.io/cli/latest/snyk-linux -o snyk
    chmod +x ./snyk
    mv ./snyk /usr/local/bin/
    
    echo "CI::Checking Snyk version..."
    snyk --version
    
    echo "CI::Authenticating Snyk..."
    snyk auth "$SNYK_TOKEN"
    
    if [ -d "api" ]; then
        echo "CI::Running Snyk test for API..."
        snyk code test ./api --org="$SNYK_ORG_ID" --report --project-name="OOPSLY-API"
    fi
    
    # Temporarily disabling UI Snyk scan
    # if [ -d "ui" ]; then
    #     echo "CI::Running Snyk test for UI..."
    #     snyk code test ./ui --org="$SNYK_ORG_ID" --report --project-name="OOPSLY-UI"
    # fi
    
    echo "CI::Security scans completed successfully!"
}

# Main execution
main() {
    # Parse arguments
    SKIP_SECURITY=false

    COMMIT_HASH=$(git rev-parse --short HEAD)

    if [[ "$REF" == "refs/heads/main" ]]; then
        export IMAGE_TAG="snapshot-$COMMIT_HASH"
    elif [[ "$REF" == "refs/heads/release" ]]; then
        export IMAGE_TAG="latest-$COMMIT_HASH"
    else
        export IMAGE_TAG=""
        echo "CI::Non-deployment branch detected. Building with dev tag only."
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-security)
                SKIP_SECURITY=true
                shift
                ;;
            *)
                echo "CI::Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Validate environment first
    validate_environment
    
    # Run all CI steps
    run_backend_ci
    run_markdown_lint
    run_frontend_ci # Temporarily disabled
    run_test_style_check
    run_integration_tests
    
    if [ "$SKIP_SECURITY" = false ]; then
        run_security_scans
    fi
    
    echo "CI::"
    echo "CI::====================================="
    echo "CI::All CI steps completed successfully!"
    echo "CI::====================================="
}

main "$@"
