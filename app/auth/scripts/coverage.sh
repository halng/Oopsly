#!/usr/bin/env sh
# Runs the tests with cross-package coverage over ./internal (test helpers excluded),
# writes coverage.out for Sonar and fails when total coverage is below COVERAGE_MIN.
# cmd/ (process wiring) is not unit tested and is left out of the metric.
set -eu

MIN="${COVERAGE_MIN:-95}"
PKGS=$(go list ./internal/... | grep -v '/testutil$' | paste -sd, -)

go test -race -coverpkg="$PKGS" -coverprofile=coverage.out ./...

TOTAL=$(go tool cover -func=coverage.out | awk '/^total:/ { gsub("%", "", $3); print $3 }')
echo "total coverage: ${TOTAL}% (minimum ${MIN}%)"
awk -v t="$TOTAL" -v m="$MIN" 'BEGIN { exit (t + 0 >= m + 0) ? 0 : 1 }' || {
  echo "coverage is below the ${MIN}% minimum" >&2
  exit 1
}
