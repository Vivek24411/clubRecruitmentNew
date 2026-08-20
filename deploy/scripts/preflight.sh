#!/usr/bin/env bash
# Read-only safety check before deploying Discovr onto the SHARED E-Cell server.
# Changes nothing except creating the web root (with your confirmation).
#
#   bash deploy/scripts/preflight.sh
set -uo pipefail

APP_ROOT=${APP_ROOT:-/home/ubuntu/discovr}
WEB_ROOT=${WEB_ROOT:-/var/www/discovr}
API_PORT=${API_PORT:-3001}
fail=0
warn=0

ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail+1)); }
note() { printf '  \033[33mWARN\033[0m %s\n' "$1"; warn=$((warn+1)); }

echo "== Docker =="
if command -v docker >/dev/null; then ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"; else bad "docker not found"; fi
if docker ps >/dev/null 2>&1; then ok "docker usable without sudo"; else bad "cannot run docker as $USER (not in docker group?)"; fi
if docker compose version >/dev/null 2>&1; then ok "compose v2 $(docker compose version --short 2>/dev/null)"; else bad "docker compose v2 plugin missing"; fi

echo "== Port $API_PORT =="
if ss -tln 2>/dev/null | grep -q ":${API_PORT}\b"; then bad "port $API_PORT already in use — pick another and update compose + nginx"; else ok "port $API_PORT is free"; fi

echo "== Disk =="
avail_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if   [[ "$avail_gb" -lt 5  ]]; then bad "only ${avail_gb}G free on / — too little to build images"
elif [[ "$avail_gb" -lt 15 ]]; then note "${avail_gb}G free on / — tight; see the reclaim hint below"
else ok "${avail_gb}G free on /"; fi
if docker ps >/dev/null 2>&1; then
  reclaim=$(docker system df 2>/dev/null | awk '/Build Cache/ {print $NF}')
  [[ -n "${reclaim:-}" ]] && echo "       reclaimable build cache: ${reclaim}  (free it with: docker builder prune -f)"
fi

echo "== nginx =="
if command -v nginx >/dev/null; then ok "nginx $(nginx -v 2>&1 | awk -F/ '{print $2}')"; else bad "nginx not installed"; fi
if sudo nginx -t >/dev/null 2>&1; then ok "existing nginx config is valid (leave it that way)"; else bad "existing nginx config is ALREADY broken — stop and tell the server admin"; fi
if [[ -d /etc/nginx/sites-enabled ]]; then
  echo "       $(ls /etc/nginx/sites-enabled | wc -l) other sites are enabled on this box — your config must be ADDITIVE"
fi

echo "== Hostname collisions =="
for host in "${@:-}"; do
  [[ -z "$host" ]] && continue
  if sudo grep -rqs "server_name.*\b${host}\b" /etc/nginx/sites-enabled/; then
    bad "$host is already served by another site file"
  else
    ok "$host is unclaimed"
  fi
done
[[ $# -eq 0 ]] && echo "       (pass your hostnames as arguments to check them)"

echo "== Repo and env files =="
[[ -d "$APP_ROOT/.git" ]] && ok "repo at $APP_ROOT" || bad "no git repo at $APP_ROOT"
[[ -f "$APP_ROOT/backend/.env" ]] && ok "backend/.env present" || bad "backend/.env missing"
if [[ -f "$APP_ROOT/backend/.env" ]]; then
  perms=$(stat -c %a "$APP_ROOT/backend/.env")
  [[ "$perms" == "600" ]] && ok "backend/.env is 600" || note "backend/.env is $perms — chmod 600 it"
  grep -q '^RUN_JOBS_IN_API=false' "$APP_ROOT/backend/.env" && ok "RUN_JOBS_IN_API=false" || note "set RUN_JOBS_IN_API=false so only the worker drains jobs"
  grep -q '^TRUST_PROXY_HOPS=1'    "$APP_ROOT/backend/.env" && ok "TRUST_PROXY_HOPS=1"   || note "set TRUST_PROXY_HOPS=1 (nginx is one hop in front)"
  grep -q '^NODE_ENV=production'   "$APP_ROOT/backend/.env" && ok "NODE_ENV=production"  || note "set NODE_ENV=production"
  secret=$(grep '^JWT_SECRET=' "$APP_ROOT/backend/.env" | cut -d= -f2- | tr -d '\r\n')
  [[ ${#secret} -ge 32 ]] && ok "JWT_SECRET length ${#secret}" || bad "JWT_SECRET is ${#secret} chars — production requires >= 32"
  grep -q '^ADMIN_PASSWORD_HASH=.\+' "$APP_ROOT/backend/.env" && ok "ADMIN_PASSWORD_HASH set" || bad "ADMIN_PASSWORD_HASH required in production"
fi
for app in student club admin; do
  [[ -f "$APP_ROOT/$app/.env.production" ]] && ok "$app/.env.production present" || bad "$app/.env.production missing (build would bake in an undefined API URL)"
done
if [[ -f "$APP_ROOT/club/.env.production" ]]; then
  grep -Eq '^VITE_STUDENT_APP_ORIGIN=https://[^/]+$' "$APP_ROOT/club/.env.production" \
    && ok "club public student origin present for QR codes" \
    || bad "club/.env.production needs VITE_STUDENT_APP_ORIGIN as a bare HTTPS origin"
fi

echo "== Web root =="
if [[ -d "$WEB_ROOT" && -w "$WEB_ROOT" ]]; then
  ok "$WEB_ROOT exists and is writable"
else
  note "$WEB_ROOT missing — create it with:"
  echo "       sudo mkdir -p $WEB_ROOT/{student,club,admin} && sudo chown -R \$USER:\$USER $WEB_ROOT"
fi

echo
echo "Result: $fail failure(s), $warn warning(s)."
[[ $fail -eq 0 ]] && echo "Safe to run deploy.sh." || echo "Fix the failures above first."
exit $(( fail > 0 ? 1 : 0 ))
