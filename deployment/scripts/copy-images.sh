#!/usr/bin/env bash
# Copies images built by the "Build and Push Docker Image" workflow (ghcr.io/halng/oopsly-*)
# into the ECR repositories created by network.yaml.
#
#   scripts/copy-images.sh <env> <image-tag> [auth|api|game ...]
#
# Needs docker and the aws CLI. For private GHCR packages run `docker login ghcr.io` first.
set -euo pipefail

ENVIRONMENT="${1:?usage: copy-images.sh <env> <image-tag> [services...]}"
TAG="${2:?usage: copy-images.sh <env> <image-tag> [services...]}"
shift 2
SERVICES=("$@")
[[ ${#SERVICES[@]} -gt 0 ]] || SERVICES=(auth api game)

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-$(aws configure get region)}}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

aws ecr get-login-password --region "$REGION" |
  docker login --username AWS --password-stdin "$REGISTRY"

for service in "${SERVICES[@]}"; do
  source_image="ghcr.io/halng/oopsly-${service}:${TAG}"
  target_image="${REGISTRY}/oopsly-${service}-${ENVIRONMENT}:${TAG}"
  echo "==> ${source_image} -> ${target_image}"
  # Fargate runs linux/amd64 here, whatever machine this script runs on.
  docker pull --platform linux/amd64 "$source_image"
  docker tag "$source_image" "$target_image"
  docker push "$target_image"
done
