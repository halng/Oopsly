#!/usr/bin/env bash
# Deploys Oopsly to AWS with the SAM CLI.
#
#   ALLOWED_ORIGINS=https://app.example.com ./deploy.sh <env> <image-tag> [network|auth|api|game|noti ...]
#
# With no stack names it deploys everything in dependency order:
#   network -> (copy images to ECR) -> auth -> api -> game -> noti
#
# noti (the email Lambda) reads its SMTP settings from Secrets Manager. Pass SMTP_HOST,
# SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM to store them; without SMTP_HOST the
# stored secret is left as it is. APP_URL sets the links in emails.
#
# ALLOWED_ORIGINS only applies to prod; every other environment allows all origins.
# <image-tag> is the tag the bupu workflow pushed, e.g. v1a2b3c4.
# Honors AWS_PROFILE / AWS_REGION. DESIRED_COUNT (default 2) sets tasks per service.
set -euo pipefail
cd "$(dirname "$0")"

ENVIRONMENT="${1:?usage: deploy.sh <env> <image-tag> [stacks...]}"
TAG="${2:?usage: deploy.sh <env> <image-tag> [stacks...]}"
shift 2
STACKS=("$@")
[[ ${#STACKS[@]} -gt 0 ]] || STACKS=(network auth api game noti)

# Browsers send `Origin` without a trailing slash and the services compare it exactly, so
# strip slashes and spaces. Anything but prod allows every origin (stg URLs change often).
if [[ "$ENVIRONMENT" == "prod" ]]; then
  ORIGINS="$(tr -d ' ' <<<"${ALLOWED_ORIGINS:-https://oopsly-web.vercel.app}" | sed -E 's#/+(,|$)#\1#g')"
else
  ORIGINS="*"
fi
COUNT="${DESIRED_COUNT:-2}"
NETWORK_STACK="oopsly-network-${ENVIRONMENT}"
AUTH_STACK="oopsly-auth-${ENVIRONMENT}"
APP_URL="${APP_URL:-https://oopsly-web.vercel.app}"

deploy() {
  local name="$1" overrides="$2"
  echo "==> sam deploy oopsly-${name}-${ENVIRONMENT}"
  set -f # keep a "*" origin from being globbed when $overrides is split
  sam deploy \
    --template-file "${name}.yaml" \
    --stack-name "oopsly-${name}-${ENVIRONMENT}" \
    --config-env "$name" \
    --capabilities CAPABILITY_IAM \
    --s3-bucket "oopsly-sam-${ENVIRONMENT}" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides $overrides
  set +f
}

has_stack() { aws cloudformation describe-stacks --stack-name "$1" >/dev/null 2>&1; }
wants() { [[ " ${STACKS[*]} " == *" $1 "* ]]; }

# api and game import the auth stack's URLs, and every service imports the network stack.
if (wants auth || wants api || wants game || wants noti) && ! wants network && ! has_stack "$NETWORK_STACK"; then
  echo "Stack $NETWORK_STACK does not exist; include 'network' first." >&2
  exit 1
fi
if (wants api || wants game) && ! wants auth && ! has_stack "$AUTH_STACK"; then
  echo "Stack $AUTH_STACK does not exist; api and game need it. Deploy 'auth' first." >&2
  exit 1
fi

# Writes the SMTP settings (from the environment, never the command line) into the secret
# the noti stack created.
store_smtp_settings() {
  if [[ -z "${SMTP_HOST:-}" ]]; then
    echo "SMTP_HOST is not set; leaving oopsly-${ENVIRONMENT}-smtp as it is." >&2
    return
  fi
  local settings
  settings="$(python3 -c '
import json, os
e = os.environ
print(json.dumps({
    "host": e["SMTP_HOST"],
    "port": int(e.get("SMTP_PORT") or 587),
    "username": e.get("SMTP_USERNAME", ""),
    "password": e.get("SMTP_PASSWORD", ""),
    "from_email": e.get("SMTP_FROM", ""),
}))')"
  aws secretsmanager put-secret-value \
    --secret-id "oopsly-${ENVIRONMENT}-smtp" --secret-string "$settings" >/dev/null
  echo "==> stored SMTP settings in oopsly-${ENVIRONMENT}-smtp"
}

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
    noti)
      deploy noti "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} AppUrl=${APP_URL}"
      store_smtp_settings
      ;;
    *)
      echo "unknown stack: $stack (use network, auth, api, game or noti)" >&2
      exit 1
      ;;
  esac
done

echo
aws cloudformation describe-stacks --stack-name "$NETWORK_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text |
  sed 's/^/Public API endpoint: /'
