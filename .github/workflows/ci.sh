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

        echo "CI::Running Gradle build..."
        ./gradlew clean build -x test
        
        echo "CI::Running Spotless Check..."
        ./gradlew spotlessCheck
        
        echo "CI::Running Unit Tests..."
        ./gradlew test
        
        echo "CI::Running Code Coverage and Verification..."
        ./gradlew jacocoTestCoverageVerification
        
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
        
        echo "CI::Detecting package manager..."
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

        echo "CI:: Detected package manager: $PKG_MANAGER"
        
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
    run_frontend_ci
    
    if [ "$SKIP_SECURITY" = false ]; then
        run_security_scans
    fi
    
    echo "CI::"
    echo "CI::====================================="
    echo "CI::All CI steps completed successfully!"
    echo "CI::====================================="
}

main "$@"
