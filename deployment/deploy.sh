#!/usr/bin/env bash
# Deploys Oopsly to AWS with the SAM CLI.
#
#   ALLOWED_ORIGINS=https://app.example.com ./deploy.sh <env> <image-tag> [network|auth|api|game ...]
#
# With no stack names it deploys everything in dependency order:
#   network -> (copy images to ECR) -> auth -> api -> game
#
# <image-tag> is the tag the bupu workflow pushed, e.g. v1a2b3c4.
# Honors AWS_PROFILE / AWS_REGION. DESIRED_COUNT (default 2) sets tasks per service.
set -euo pipefail
cd "$(dirname "$0")"

ENVIRONMENT="${1:?usage: deploy.sh <env> <image-tag> [stacks...]}"
TAG="${2:?usage: deploy.sh <env> <image-tag> [stacks...]}"
shift 2
STACKS=("$@")
[[ ${#STACKS[@]} -gt 0 ]] || STACKS=(network auth api game)

ORIGINS="${ALLOWED_ORIGINS:-https://oopsly-web.vercel.app/}"
COUNT="${DESIRED_COUNT:-2}"
NETWORK_STACK="oopsly-network-${ENVIRONMENT}"
AUTH_STACK="oopsly-auth-${ENVIRONMENT}"

deploy() {
  local name="$1" overrides="$2"
  echo "==> sam deploy oopsly-${name}-${ENVIRONMENT}"
  sam deploy \
    --template-file "${name}.yaml" \
    --stack-name "oopsly-${name}-${ENVIRONMENT}" \
    --config-env "$name" \
    --capabilities CAPABILITY_IAM \
    --resolve-s3 \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides $overrides
}

has_stack() { aws cloudformation describe-stacks --stack-name "$1" >/dev/null 2>&1; }
wants() { [[ " ${STACKS[*]} " == *" $1 "* ]]; }

# api and game import the auth stack's URLs, and every service imports the network stack.
if (wants auth || wants api || wants game) && ! wants network && ! has_stack "$NETWORK_STACK"; then
  echo "Stack $NETWORK_STACK does not exist; include 'network' first." >&2
  exit 1
fi
if (wants api || wants game) && ! wants auth && ! has_stack "$AUTH_STACK"; then
  echo "Stack $AUTH_STACK does not exist; api and game need it. Deploy 'auth' first." >&2
  exit 1
fi

for stack in "${STACKS[@]}"; do
  case "$stack" in
    network)
      deploy network "Environment=${ENVIRONMENT} AllowedOrigins=${ORIGINS}"
      ;;
    auth)
      scripts/copy-images.sh "$ENVIRONMENT" "$TAG" auth
      deploy auth "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} ImageTag=${TAG} DesiredCount=${COUNT} AllowedOrigins=${ORIGINS}"
      ;;
    api)
      scripts/copy-images.sh "$ENVIRONMENT" "$TAG" api
      deploy api "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} AuthStackName=${AUTH_STACK} ImageTag=${TAG} DesiredCount=${COUNT} AllowedOrigins=${ORIGINS}"
      ;;
    game)
      scripts/copy-images.sh "$ENVIRONMENT" "$TAG" game
      deploy game "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} AuthStackName=${AUTH_STACK} ImageTag=${TAG} DesiredCount=${COUNT} CorsOrigins=${ORIGINS}"
      ;;
    *)
      echo "unknown stack: $stack (use network, auth, api or game)" >&2
      exit 1
      ;;
  esac
done

echo
aws cloudformation describe-stacks --stack-name "$NETWORK_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text |
  sed 's/^/Public API endpoint: /'
