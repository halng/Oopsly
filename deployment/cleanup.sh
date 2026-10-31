#!/usr/bin/env bash
# Deletes Oopsly stacks from AWS to stop paying for them.
#
#   ./cleanup.sh <env> [network|auth|api|game|noti|all ...]
#
# Stacks are deleted in reverse dependency order (noti, game, api, auth, network), whatever the
# order of the arguments. `all` is every stack. Deleting `auth` needs `api` and `game` gone
# (they import its outputs), and `network` needs every service gone.
#
# Left behind on purpose: the final Postgres snapshot (delete it by hand if the data is not
# needed) and, in prod, the avatar bucket. Other environments lose the bucket too, because
# its fixed name (oopsly-avatar-<env>) would block the next deploy. Honors AWS_PROFILE / AWS_REGION.
set -euo pipefail

ENVIRONMENT="${1:?usage: cleanup.sh <env> [network|auth|api|game|noti|all ...]}"
shift
REQUESTED=("$@")
[[ ${#REQUESTED[@]} -gt 0 ]] || REQUESTED=(all)

wants() { [[ " ${REQUESTED[*]} " == *" $1 "* || " ${REQUESTED[*]} " == *" all "* ]]; }
has_stack() { aws cloudformation describe-stacks --stack-name "$1" >/dev/null 2>&1; }

for stack in "${REQUESTED[@]}"; do
  case "$stack" in
    network | auth | api | game | noti | all) ;;
    *) echo "unknown stack: $stack (use network, auth, api, game, noti or all)" >&2; exit 1 ;;
  esac
done

for service in noti game api auth network; do
  wants "$service" || continue
  name="oopsly-${service}-${ENVIRONMENT}"
  if ! has_stack "$name"; then
    echo "==> $name does not exist; skipping"
    continue
  fi
  echo "==> deleting $name"
  aws cloudformation delete-stack --stack-name "$name"
  aws cloudformation wait stack-delete-complete --stack-name "$name"
done

# Secrets Manager keeps deleted secrets for a recovery window, which blocks recreating a
# secret with the same name on the next deploy. Remove them for good.
if wants network; then
  for secret in db internal-key jwt-passphrase game-database-url smtp; do
    aws secretsmanager delete-secret \
      --secret-id "oopsly-${ENVIRONMENT}-${secret}" \
      --force-delete-without-recovery >/dev/null 2>&1 &&
      echo "==> purged secret oopsly-${ENVIRONMENT}-${secret}" || true
  done
fi
# The avatar bucket is retained by the stack. Its name is fixed, so it must go before the
# network stack can be created again; prod keeps its avatars.
if wants network && [[ "$ENVIRONMENT" != "prod" ]]; then
  bucket="oopsly-avatar-${ENVIRONMENT}"
  aws s3 rb "s3://${bucket}" --force >/dev/null 2>&1 &&
    echo "==> deleted bucket ${bucket}" || true
fi
echo "Cleanup of ${ENVIRONMENT} finished."
