#!/bin/bash
set -e

# CI Script - Unified CI pipeline for Oopsly
# This script consolidates all CI steps from the existing workflows

echo "====================================="
echo "Starting Unified CI Pipeline"
echo "====================================="

# Backend CI (api directory)
run_backend_ci() {
    echo ""
    echo "====================================="
    echo "Running Backend CI (api)"
    echo "====================================="
    
    if [ -d "api" ]; then
        cd api
        
        echo "Running Spotless Check..."
        ./gradlew spotlessCheck
        
        echo "Running Unit Tests..."
        ./gradlew test
        
        echo "Running Code Coverage and Verification..."
        ./gradlew jacocoTestCoverageVerification
        
        cd ..
        echo "Backend CI completed successfully!"
    else
        echo "Warning: api directory not found, skipping backend CI"
    fi
}

# Frontend CI (ui directory)
run_frontend_ci() {
    echo ""
    echo "====================================="
    echo "Running Frontend CI (ui)"
    echo "====================================="
    
    if [ -d "ui" ]; then
        cd ui
        
        # Detect package manager
        PKG_MANAGER=""
        echo "Installing packages..."
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
        
        echo "Running ESLint..."
        $PKG_MANAGER run lint
        
        echo "Running Unit Tests with coverage..."
        $PKG_MANAGER run test:coverage
        
        cd ..
        echo "Frontend CI completed successfully!"
    else
        echo "Warning: ui directory not found, skipping frontend CI"
    fi
}

# Markdown Linting
run_markdown_lint() {
    echo ""
    echo "====================================="
    echo "Running Markdown Linting"
    echo "====================================="
    
    if command -v markdownlint-cli2 &> /dev/null; then
        markdownlint-cli2 '**/*.md'
        echo "Markdown linting completed successfully!"
    else
        echo "Installing markdownlint-cli2..."
        npm install -g markdownlint-cli2
        markdownlint-cli2 '**/*.md'
        echo "Markdown linting completed successfully!"
    fi
}

# Python Test Style Check (test directory)
run_test_style_check() {
    echo ""
    echo "====================================="
    echo "Running Test Style Check (Python)"
    echo "====================================="
    
    if [ -d "test" ]; then
        echo "Installing Python dependencies..."
        python -m pip install --upgrade pip
        pip install -r test/config/requirement.txt
        
        echo "Running black style check..."
        black --check test/
        
        echo "Test style check completed successfully!"
    else
        echo "Warning: test directory not found, skipping test style check"
    fi
}

# Security Scans (Snyk)
run_security_scans() {
    echo ""
    echo "====================================="
    echo "Running Security Scans (Snyk)"
    echo "====================================="
    
    if [ -z "$SNYK_TOKEN" ]; then
        echo "Warning: SNYK_TOKEN not set, skipping security scans"
        return 0
    fi
    
    # Snyk organization ID
    SNYK_ORG_ID="${SNYK_ORG_ID:-a8c77c31-638a-4516-ab03-0e14eb961631}"
    
    echo "Setting up Snyk CLI..."
    curl -sS https://static.snyk.io/cli/latest/snyk-linux -o snyk
    curl -sS https://static.snyk.io/cli/latest/snyk-linux.sha256 -o snyk.sha256
    
    echo "Verifying Snyk CLI checksum..."
    sha256sum -c snyk.sha256
    
    chmod +x ./snyk
    mv ./snyk /usr/local/bin/
    rm -f snyk.sha256
    
    echo "Checking Snyk version..."
    snyk --version
    
    echo "Authenticating Snyk..."
    snyk auth "$SNYK_TOKEN"
    
    if [ -d "api" ]; then
        echo "Running Snyk test for API..."
        snyk code test ./api --org="$SNYK_ORG_ID" --report --project-name="OSMOSIS-API"
    fi
    
    if [ -d "ui" ]; then
        echo "Running Snyk test for UI..."
        snyk code test ./ui --org="$SNYK_ORG_ID" --report --project-name="OSMOSIS-UI"
    fi
    
    echo "Security scans completed successfully!"
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
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run all CI steps
    run_backend_ci
    run_frontend_ci
    run_markdown_lint
    run_test_style_check
    
    if [ "$SKIP_SECURITY" = false ]; then
        run_security_scans
    fi
    
    echo ""
    echo "====================================="
    echo "All CI steps completed successfully!"
    echo "====================================="
}

main "$@"
