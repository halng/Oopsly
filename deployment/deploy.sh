#!/usr/bin/env bash
# Deploys Quizi to AWS with the SAM CLI.
#
#   ALLOWED_ORIGINS=https://app.example.com ./deploy.sh <env> <image-tag> [network|auth|api|game|noti ...]
#
# With no stack names it deploys everything in dependency order:
#   network -> (copy images to ECR) -> auth -> api -> game -> noti
# (noti has no dependencies; auth only needs its function name, so any order works)
#
# noti (the email Lambda) reads its Resend settings from Secrets Manager. Pass RESEND_API_KEY
# and RESEND_FROM (like "Quizi <no-reply@quizi.tech>") to store them; without RESEND_API_KEY
# the stored secret is left as it is. APP_URL sets the links in emails.
#
# Custom domains: HOSTED_ZONE_ID is the Route 53 zone of quizi.tech. With it, network serves
# the API on API_DOMAIN and the WebSockets on WS_DOMAIN, and (prod) points WEB_DOMAIN at the UI
# host (WEB_TARGET, default Vercel's 76.76.21.21). The names are fixed per environment:
#   prod:    api.quizi.tech      ws.quizi.tech      quizi.tech
#   others:  <env>-api.quizi.tech  <env>-ws.quizi.tech (e.g. stg-api.quizi.tech), no web domain
# The release-web workflow derives the same URLs, so keep them in step. Without HOSTED_ZONE_ID
# no custom domain is created.
#
# ALLOWED_ORIGINS only applies to prod; every other environment allows all origins.
# <image-tag> is the tag the bupu workflow pushed, e.g. v1a2b3c4.
# Honors AWS_PROFILE / AWS_REGION. Tasks per service: AUTH_COUNT (1), API_COUNT (2), GAME_COUNT (1).
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
  ORIGINS="$(tr -d ' ' <<<"${ALLOWED_ORIGINS:-https://quizi.tech}" | sed -E 's#/+(,|$)#\1#g')"
else
  ORIGINS="*"
fi
AUTH_COUNT="${AUTH_COUNT:-1}"
API_COUNT="${API_COUNT:-2}"
GAME_COUNT="${GAME_COUNT:-1}"
NETWORK_STACK="quizi-network-${ENVIRONMENT}"
AUTH_STACK="quizi-auth-${ENVIRONMENT}"
APP_URL="${APP_URL:-https://quizi.tech}"

HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
if [[ "$ENVIRONMENT" == "prod" ]]; then
  API_DOMAIN="${API_DOMAIN:-api.quizi.tech}"
  WEB_DOMAIN="${WEB_DOMAIN:-quizi.tech}"
  WS_DOMAIN="${WS_DOMAIN:-ws.quizi.tech}"
else
  API_DOMAIN="${API_DOMAIN:-${ENVIRONMENT}-api.quizi.tech}"
  WEB_DOMAIN="${WEB_DOMAIN:-}"
  WS_DOMAIN="${WS_DOMAIN:-${ENVIRONMENT}-ws.quizi.tech}"
fi
WEB_TARGET="${WEB_TARGET:-76.76.21.21}"
NETWORK_OVERRIDES="Environment=${ENVIRONMENT} AllowedOrigins=${ORIGINS} WebTarget=${WEB_TARGET}"
if [[ -n "$HOSTED_ZONE_ID" ]]; then
  NETWORK_OVERRIDES+=" HostedZoneId=${HOSTED_ZONE_ID} ApiDomainName=${API_DOMAIN} WebDomainName=${WEB_DOMAIN} WsDomainName=${WS_DOMAIN}"
fi

deploy() {
  local name="$1" overrides="$2"
  echo "==> sam deploy quizi-${name}-${ENVIRONMENT}"
  set -f # keep a "*" origin from being globbed when $overrides is split
  sam deploy \
    --template-file "${name}.yaml" \
    --stack-name "quizi-${name}-${ENVIRONMENT}" \
    --config-env "$name" \
    --capabilities CAPABILITY_IAM \
    --s3-bucket "quizi-sam-${ENVIRONMENT}" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides $overrides
  set +f
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

# Writes the Resend settings (from the environment, never the command line) into the secret
# the noti stack created.
store_resend_settings() {
  if [[ -z "${RESEND_API_KEY:-}" ]]; then
    echo "RESEND_API_KEY is not set; leaving quizi-${ENVIRONMENT}-resend as it is." >&2
    return
  fi
  local settings
  settings="$(python3 -c '
import json, os
e = os.environ
print(json.dumps({
    "api_key": e["RESEND_API_KEY"],
    "from_email": e.get("RESEND_FROM", ""),
}))')"
  aws secretsmanager put-secret-value \
    --secret-id "quizi-${ENVIRONMENT}-resend" --secret-string "$settings" >/dev/null
  echo "==> stored Resend settings in quizi-${ENVIRONMENT}-resend"
}

for stack in "${STACKS[@]}"; do
  case "$stack" in
    network)
      deploy network "$NETWORK_OVERRIDES"
      ;;
    auth)
      scripts/copy-images.sh "$ENVIRONMENT" "$TAG" auth
      deploy auth "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} ImageTag=${TAG} DesiredCount=${AUTH_COUNT} AllowedOrigins=${ORIGINS}"
      ;;
    api)
      scripts/copy-images.sh "$ENVIRONMENT" "$TAG" api
      deploy api "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} AuthStackName=${AUTH_STACK} ImageTag=${TAG} DesiredCount=${API_COUNT} AllowedOrigins=${ORIGINS}"
      ;;
    game)
      scripts/copy-images.sh "$ENVIRONMENT" "$TAG" game
      deploy game "Environment=${ENVIRONMENT} NetworkStackName=${NETWORK_STACK} AuthStackName=${AUTH_STACK} ImageTag=${TAG} DesiredCount=${GAME_COUNT} CorsOrigins=${ORIGINS}"
      ;;
    noti)
      deploy noti "Environment=${ENVIRONMENT} AppUrl=${APP_URL}"
      store_resend_settings
      ;;
    *)
      echo "unknown stack: $stack (use network, auth, api, game or noti)" >&2
      exit 1
      ;;
  esac
done

echo
aws cloudformation describe-stacks --stack-name "$NETWORK_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text |
  sed 's/^/Public API URL: /'
