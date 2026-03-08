#!/bin/bash
set -e

# CD Script - Unified CD pipeline for Oopsly

echo "CD::====================================="
echo "CD::Starting Unified CD Pipeline"
echo "CD::====================================="

# Validate environment by checking tool versions
validate_environment() {
    echo "CD::"
    echo "CD::====================================="
    echo "CD::Validating Environment"
    echo "CD::====================================="
    
    local validation_failed=false
    
    # Check Java
    echo "CD::Checking Java..."
    if command -v java &> /dev/null; then
        java -version
    else
        echo "CD::ERROR: Java is not installed"
        validation_failed=true
    fi
    
    # Check Gradle wrapper (will be checked in api directory)
    echo "CD::Checking Gradle..."
    if [ -d "api" ] && [ -f "api/gradlew" ]; then
        echo "CD::Gradle wrapper found in api directory"
    else
        echo "CD::WARNING: Gradle wrapper not found in api directory"
    fi
    
    # Check Node.js
    echo "CD::Checking Node.js..."
    if command -v node &> /dev/null; then
        node --version
    else
        echo "CD::ERROR: Node.js is not installed"
        validation_failed=true
    fi
    
    # Check npm
    echo "CD::Checking npm..."
    if command -v npm &> /dev/null; then
        npm --version
    else
        echo "CD::ERROR: npm is not installed"
        validation_failed=true
    fi

        
    if [ "$validation_failed" = true ]; then
        echo "CD::"
        echo "CD::ERROR: Environment validation failed. Please install missing dependencies."
        exit 1
    fi
}

install_cli_tools() {
    echo "CD::================================="
    echo "CD::Installing CLI Tools"
    echo "CD::================================="

    cd ui

    echo "CD::Step 1: Installing pnpm globally..."
    npm install -g pnpm
    echo "CD::Step 2: Installing project dependencies with pnpm..."
    pnpm install --frozen-lockfile
    echo "CD::Step 3: Installing eas-cli globally..."
    npm install -g eas-cli
    echo "CD::Step 4: Logging into eas-cli..."
    eas whoami || eas login --token $EXPO_TOKEN

    cd ..
    echo "CD::CLI tools installation completed successfully!"

}

build_docker_image_api() {
    echo "CD::================================="
    echo "CD::Building and Pushing Docker Image for API"
    echo "CD::================================="
    cd api

    if [ -n "$IMAGE_TAG" ]; then
        echo "CD::Building Docker image with tag: $IMAGE_TAG"
        ./gradlew bootBuildImage --imageName=ghcr.io/halng/oopsly-api:"$IMAGE_TAG"

        echo "CD::Logging to container registry..."
        echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin

        echo "CD::Pushing Docker image to registry..."
        docker push ghcr.io/halng/oopsly-api:"$IMAGE_TAG"

        echo "CD::Docker image ghcr.io/halng/oopsly-api:$IMAGE_TAG built and pushed successfully!"
    else
        echo "CD::No IMAGE_TAG set; skipping Docker image build and push."
    fi
    cd ..
}

build_artifact_ui() {
    echo "CD::================================="
    echo "CD::Building UI Artifact"
    echo "CD::================================="
    
    if [ -d "ui" ]; then
        cd ui
        if [[ "$REF" == "refs/heads/main" ]]; then
            echo "CD::Main branch detected. Building with production workflow."
            eas workflow:run .eas/workflows/production-build.yaml
            # TODO: submit to EAS Submit for app store distribution
        elif [[ "$REF" == refs/heads/release/* ]]; then
            echo "CD::Release branch detected. Building with development workflow."
            eas workflow:run .eas/workflows/development-build.yaml
        else
            echo "CD::Non-deployment branch detected. Building with dev tag only."
        fi
        cd ..
    else
        echo "CD::Warning: ui directory not found, skipping UI artifact build"
    fi
}



# Main execution
main() {

    COMMIT_HASH=$(git rev-parse --short HEAD)

    if [[ "$REF" == "refs/heads/main" ]]; then
        export IMAGE_TAG="latest-$COMMIT_HASH"
    elif [[ "$REF" == refs/heads/release/* ]]; then
        export IMAGE_TAG="snapshot-$COMMIT_HASH"
    else
        export IMAGE_TAG=""
        echo "CD::Non-deployment branch detected. Building with dev tag only."
    fi
    
    # Validate environment first
    validate_environment
    install_cli_tools
    build_docker_image_api
    build_artifact_ui
    
    echo "CD::"
    echo "CD::====================================="
    echo "CD::All CD steps completed successfully!"
    echo "CD::====================================="
}

main
