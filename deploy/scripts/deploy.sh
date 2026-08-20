#!/usr/bin/env bash
# Deploy / redeploy Discovr on the shared E-Cell server.
#
#   bash /home/ubuntu/discovr/deploy/scripts/deploy.sh
#   ONLY=student  bash .../deploy.sh     # rebuild one frontend
#   SKIP_PULL=1   bash .../deploy.sh     # build what is on disk
#   SKIP_WEB=1    bash .../deploy.sh     # backend containers only
#
# Touches only: this repo, /var/www/discovr, and the two discovr containers.
# Nothing else on the host is modified — no apt, no system Node, no firewall,
# and no other team's nginx config or containers.
set -euo pipefail

APP_ROOT=${APP_ROOT:-/home/ubuntu/discovr}
WEB_ROOT=${WEB_ROOT:-/var/www/discovr}
BRANCH=${BRANCH:-main}
COMPOSE_FILE="$APP_ROOT/deploy/docker/docker-compose.yml"
API_HEALTH=${API_HEALTH:-http://127.0.0.1:3001/ping}

cd "$APP_ROOT"

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  echo "==> Pulling $BRANCH"
  git fetch --prune origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

if [[ "${SKIP_WEB:-0}" != "1" ]]; then
  for app in student club admin; do
    [[ -n "${ONLY:-}" && "${ONLY}" != "$app" ]] && continue

    echo "==> Building $app"
    if [[ ! -f "$APP_ROOT/$app/.env.production" ]]; then
      echo "!! $app/.env.production is missing — VITE_BASE_URI would be undefined. Aborting." >&2
      exit 1
    fi
    if [[ "$app" == "club" ]] && ! grep -Eq '^VITE_STUDENT_APP_ORIGIN=https://[^/]+$' "$APP_ROOT/$app/.env.production"; then
      echo "!! club/.env.production needs VITE_STUDENT_APP_ORIGIN as a bare HTTPS origin for QR codes. Aborting." >&2
      exit 1
    fi

    staging="$(mktemp -d /tmp/discovr-"$app"-XXXX)"
    trap 'rm -rf "$staging"' EXIT

    # Builds inside a node:22 container — the host's Node 20 is never involved.
    DOCKER_BUILDKIT=1 docker build \
      -f "$APP_ROOT/deploy/docker/frontend.Dockerfile" \
      --build-arg APP="$app" \
      --target export \
      --output "type=local,dest=$staging" \
      "$APP_ROOT"

    if [[ ! -f "$staging/index.html" ]]; then
      echo "!! build produced no index.html for $app. Aborting before touching the live site." >&2
      exit 1
    fi

    mkdir -p "$WEB_ROOT/$app"
    # --delete clears stale hashed assets; the check above means we never
    # wipe a working site with an empty build.
    #
    # --chmod is not optional: mktemp -d creates the staging dir as 0700, and
    # plain `rsync -a` would copy that onto the web root, leaving nginx's
    # www-data unable to traverse it (every request 403s). Force web-safe
    # modes instead of inheriting whatever the build produced.
    rsync -a --chmod=D755,F644 --delete "$staging"/ "$WEB_ROOT/$app"/
    chmod 755 "$WEB_ROOT/$app"
    rm -rf "$staging"; trap - EXIT
    echo "    published to $WEB_ROOT/$app"
  done
fi

echo "==> Rebuilding and restarting containers"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Health check"
for _ in $(seq 1 20); do
  if curl -fsS "$API_HEALTH" >/dev/null 2>&1; then
    echo "    API:      $(curl -fsS "$API_HEALTH")"
    echo "    DB:       $(curl -fsS "${API_HEALTH}/db-health")"
    docker compose -f "$COMPOSE_FILE" ps
    echo "Deploy complete."
    exit 0
  fi
  sleep 3
done

echo "!! API did not become healthy. Recent logs:" >&2
docker compose -f "$COMPOSE_FILE" logs --tail 50 api >&2
exit 1
