# Deploying Discovr onto the E-Cell AWS server

Moving the three React apps, the Express API, and the mail/push worker off Render + Vercel and onto `3.6.91.54`, using Docker Compose behind the server's existing nginx.

> **This is a shared production server.** It already runs E-Cell's entire web presence. Every step below is *additive*: new containers, one new nginx file, one new directory. Nothing existing is upgraded, restarted, or reconfigured. Read [Rules of engagement](#rules-of-engagement) before you run anything.

---

## The server you are deploying onto

Verified on 2026-08-19 by SSH inspection.

| | |
|---|---|
| Host | `ubuntu@3.6.91.54` — Ubuntu 20.04.6 LTS, x86_64 |
| Capacity | 4 vCPU · 15 GB RAM · 156 GB disk, **86% full (22 GB free)** · no swap |
| Web server | nginx 1.18 serving **~20 site files** on :80/:443 |
| Domains live here | `ecelliitr.org`, `esummit.in` (+ `api`, `b`, `cap`, `gamma`, `ws`, `django`, `firstapi`, `portal`, `22/23/24`), `delta.ecelliitr.org` |
| Containers | 6 running: E-Summit '26 front/back + workers, cap2025, e-cell website front/back (ports 4000, 4069, 5000, 8000) |
| Toolchain | Docker 24.0.2, Compose v2.18.1, buildx 0.10.5 · `ubuntu` is in the `docker` group |
| Host Node | v20.19.5 — **other things depend on it; we do not touch it** |
| Also running | A GitHub Actions self-hosted runner (`actions.runner.Ecell-IITR`) |
| TLS | certbot installed, ~11 Let's Encrypt certs auto-renewing |
| Port 3001 | free — this is where the API will bind |

Because the host's Node is v20 and your backend requires `>=22`, the API runs in a `node:22` container and the frontends are *built* in one too. The host's Node is never involved.

### Two pre-existing issues, for whoever owns this box

Not part of this deployment, but worth reporting:

- **`api.ecelliitr.org` has an expired certificate** (expired 2025-11-07, ~9 months ago) while still having a live nginx server block — browsers hitting it get a TLS warning. `portal.esummit.in` is also expired.
- **Disk is at 86%.** Docker is holding **25 GB of build cache** and ~50 GB of unused images. `docker builder prune -f` reclaims the cache safely (it's only cache). Image cleanup is riskier — other teams may rely on those for rollback, so leave `docker image prune -a` to the admin.

---

## Rules of engagement

Things that would be routine on a dedicated box and are **not allowed here**:

| Do not | Why |
|---|---|
| `apt-get upgrade` | Would upgrade nginx/Docker beneath six running production apps |
| Install Node 22 on the host | Replaces system Node 20 for the Actions runner and everything else |
| `ufw enable` | Firewall is deliberately inactive; Docker's iptables rules interact badly with it |
| `rm /etc/nginx/sites-enabled/default` or edit another site file | That's another team's config |
| `systemctl restart nginx` | Use `nginx -t && systemctl reload nginx` — reload is graceful, restart drops live connections |
| Publish a container on `0.0.0.0` | Docker bypasses the host firewall; bind API ports to `127.0.0.1` only |
| `docker image prune -a` / `docker system prune -a` | Deletes other teams' images |
| Change existing security group rules | Ports 4000/4069/5000/8000 may be intentionally reachable |

Everything in this runbook stays inside: `/home/ubuntu/discovr`, `/var/www/discovr`, two containers named `discovr-*`, and one file `/etc/nginx/sites-available/discovr.conf`.

**Rollback for the whole deployment** is three commands, and it cannot affect any other app:

```bash
docker compose -f /home/ubuntu/discovr/deploy/docker/docker-compose.yml down
sudo rm /etc/nginx/sites-enabled/discovr.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## Target layout

```
        Internet ──► nginx (already running, ~20 other sites)
                        │
     ┌──────────────────┼──────────────────────────────┐
     │ existing sites   │  NEW: 4 server blocks        │
     │ (untouched)      │                              │
     └──────────────────┤  discovr.iitr.ac.in          │──► /var/www/discovr/student
                        │  club.discovr.iitr.ac.in     │──► /var/www/discovr/club
                        │  admin.discovr.iitr.ac.in    │──► /var/www/discovr/admin
                        │  api.discovr.iitr.ac.in      │──► 127.0.0.1:3001
                        └──────────────────────────────┘        │
                                                                ▼
                                          docker compose ┌── discovr-api    (node:22)
                                                         └── discovr-worker (node:22)
                                                                │
                                     Atlas · Cloudinary · Resend · FCM (external, unchanged)
```

| File | Purpose |
|---|---|
| [deploy/scripts/preflight.sh](deploy/scripts/preflight.sh) | Read-only safety check — run this first, every time |
| [deploy/scripts/deploy.sh](deploy/scripts/deploy.sh) | Build frontends in a container, publish, rebuild + restart the API/worker |
| [deploy/docker/backend.Dockerfile](deploy/docker/backend.Dockerfile) | One image, two containers (`server.js` / `worker.js`) |
| [deploy/docker/frontend.Dockerfile](deploy/docker/frontend.Dockerfile) | Builds a Vite SPA and exports static files — no runtime container |
| [deploy/docker/docker-compose.yml](deploy/docker/docker-compose.yml) | API + worker, loopback-bound, log-capped |
| [deploy/nginx/discovr.conf.template](deploy/nginx/discovr.conf.template) | The four new server blocks |
| [deploy/env/](deploy/env/) | Annotated env templates |

---

## Phase 0 — Connect

Already set up on your laptop: the key is at `~/.ssh/ecell-server.pem` (mode 400) and `~/.ssh/config` has an alias, so:

```bash
ssh ecell
```

Equivalent to `ssh -i ~/.ssh/ecell-server.pem ubuntu@3.6.91.54`.

Once you've confirmed it works, delete the loose copy of the key from Downloads — it's a credential sitting in a synced folder:

```bash
rm ~/Downloads/'E-Cell-Server-keypair (1).pem'
```

---

## Phase 1 — Check the network config (don't change it)

### 1.1 Confirm the IP is Elastic

`3.6.91.54` has served these domains for years, so it is almost certainly already an Elastic IP — but confirm, because a plain public IP changes on stop/start and would break every domain on this box, not just yours.

**EC2 → Network & Security → Elastic IPs** — look for `3.6.91.54` associated with this instance. If it isn't there, tell the admin; allocating and attaching one is a change with box-wide impact and isn't yours to make unilaterally.

### 1.2 Confirm 80/443 are open, change nothing else

**EC2 → Instances → this instance → Security tab → inbound rules.** You need 80 and 443 open to `0.0.0.0/0` — they already are, since the existing sites work.

Do **not** tidy up the other rules. Ports 4000/4069/5000/8000 are published by other teams' containers and may be reachable deliberately.

---

## Phase 2 — DNS from IITR IT  ← *the long pole, start today*

You chose institute subdomains, so nothing can go live until IT creates the records. Everything else in this runbook can be built and tested while you wait.

**A caution from this box:** there is already an nginx site for `cap.ecell.iitr.ac.in`, but that hostname **does not resolve** — the config was written and the DNS record was apparently never created. Assume the same could happen to you: get explicit confirmation the records are live, not just acknowledged.

Send IT:

> We run E-Cell's web applications on our AWS server at **3.6.91.54** (it already hosts `ecelliitr.org` and `esummit.in`). For our recruitment portal, Discovr, please create the following A records:
>
> ```
> discovr.iitr.ac.in        A   3.6.91.54   TTL 300
> club.discovr.iitr.ac.in   A   3.6.91.54   TTL 300
> admin.discovr.iitr.ac.in  A   3.6.91.54   TTL 300
> api.discovr.iitr.ac.in    A   3.6.91.54   TTL 300
> ```
>
> A wildcard `*.discovr.iitr.ac.in → 3.6.91.54` alongside `discovr.iitr.ac.in` would also work and is fewer records to maintain.
>
> Could you confirm once the records are actually resolving? We have an older config for `cap.ecell.iitr.ac.in` whose record appears never to have been created, and we would like to avoid repeating that.
>
> One requirement: inbound HTTP (port 80) needs to be reachable on these names once, for Let's Encrypt domain validation. After that all traffic is HTTPS. If the institute issues its own certificates for `*.iitr.ac.in`, we are happy to install those instead.

If IT pushes back on names directly under `iitr.ac.in` — some institutes reserve that level and prefer a delegated sub-zone — the fallback is the same four labels under `ecell.iitr.ac.in`. Only the four hostnames change; nothing in the deployment does, so it costs you one `sed` and a rebuild of the three frontends.

Check whether it's landed:

```bash
dig +short discovr.iitr.ac.in    # must print 3.6.91.54
```

**While you wait**, build and test everything through Phase 6 using the Host-header trick (Phase 6) — no DNS needed. If IT stalls for weeks, you can soft-launch on a subdomain of `ecelliitr.org` (you control that DNS) and add the institute names to the certificate later.

---

## Phase 3 — Get the code onto the server

Follow the house convention — every other app lives in `/home/ubuntu/<name>-docker/` or similar:

```bash
ssh ecell
git clone https://github.com/Vivek24411/clubRecruitmentNew.git /home/ubuntu/discovr
cd /home/ubuntu/discovr
```

Private repo? Use a read-only deploy key:

```bash
ssh-keygen -t ed25519 -C "discovr-deploy" -f ~/.ssh/discovr_deploy -N ""
cat ~/.ssh/discovr_deploy.pub    # add at GitHub → repo → Settings → Deploy keys
printf '\nHost github-discovr\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/discovr_deploy\n' >> ~/.ssh/config
git clone git@github-discovr:Vivek24411/clubRecruitmentNew.git /home/ubuntu/discovr
```

Create the web root (the only thing outside your directories that you create):

```bash
sudo mkdir -p /var/www/discovr/{student,club,admin}
sudo chown -R ubuntu:ubuntu /var/www/discovr
```

Free up build-cache space — safe, it's only cache:

```bash
docker builder prune -f     # reclaims ~25 GB on this box
df -h /
```

---

## Phase 4 — Environment variables

**Copy the values from Render and Vercel, not from your local `.env` files.** Your working copy is development config: `VITE_BASE_URI=http://localhost:3001`, and an 11-character `JWT_SECRET`. [validateEnv.js](backend/src/config/validateEnv.js) refuses to boot under `NODE_ENV=production` unless the secret is ≥32 characters and `ADMIN_PASSWORD_HASH` is set. Render already has correct values — that's your source.

- **Backend:** Render → your service → **Environment**
- **Frontends:** Vercel → project → **Settings → Environment Variables**

### 4.1 API environment

```bash
nano /home/ubuntu/discovr/backend/.env
chmod 600 /home/ubuntu/discovr/backend/.env
```

Paste the Render values, then change these five:

| Variable | Value here | Why |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://discovr.iitr.ac.in,https://club.discovr.iitr.ac.in,https://admin.discovr.iitr.ac.in` | Exact origins, comma-separated, **no trailing slash**. `validateEnv` rejects malformed entries; `app.js` blocks anything not listed |
| `STUDENT_APP_ORIGIN` | `https://discovr.iitr.ac.in` | Push notification deep links; required when `PUSH_NOTIFICATIONS_ENABLED=true` |
| `RUN_JOBS_IN_API` | `false` | The worker container drains the queue; `true` makes both containers poll the same jobs |
| `TRUST_PROXY_HOPS` | `1` | nginx is one hop in front. Without it every request looks like `127.0.0.1` and [rateLimit.js](backend/src/middlewares/rateLimit.js) throttles all users as a single bucket |
| `PORT` | `3001` | Matches the compose port mapping and the nginx upstream |

Everything else — `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `CLOUDINARY_*`, `RESEND_*`, `FIREBASE_*` — copies across unchanged. Keep `JWT_SECRET` identical to Render's so currently-logged-in users stay logged in through the cutover.

Template: [deploy/env/backend.env.example](deploy/env/backend.env.example).

This file is **never** copied into the Docker image — `.dockerignore` excludes `**/.env`, and compose mounts it at run time via `env_file`.

If you need to generate a password hash (Render should already have one):

```bash
read -rsp 'Admin password: ' P && echo
docker run --rm -v /home/ubuntu/discovr/backend:/app -w /app node:22-bookworm-slim \
  sh -c 'npm i bcrypt --silent >/dev/null 2>&1 && node -e "require(\"bcrypt\").hash(process.argv[1],12).then(h=>console.log(h))" "$0"' "$P"
unset P
```

### 4.2 Frontend environments

Vite inlines these at **build time** — changing one requires a rebuild, not a restart.

```bash
nano /home/ubuntu/discovr/student/.env.production   # API base + 7 Firebase keys
nano /home/ubuntu/discovr/club/.env.production      # API base only
nano /home/ubuntu/discovr/admin/.env.production     # API base only
```

All three:

```
VITE_BASE_URI=https://api.discovr.iitr.ac.in
```

No trailing slash — URLs are built as `${VITE_BASE_URI}/student/login`. The student app also needs the seven `VITE_FIREBASE_*` values from Vercel. Templates in [deploy/env/](deploy/env/).

`.gitignore` now covers `.env.production`, so these can't be committed by accident.

---

## Phase 5 — Preflight, then deploy

Always preflight first. It changes nothing and catches the mistakes that would otherwise surface as a 502 at 2am:

```bash
cd /home/ubuntu/discovr
bash deploy/scripts/preflight.sh \
  discovr.iitr.ac.in club.discovr.iitr.ac.in \
  admin.discovr.iitr.ac.in api.discovr.iitr.ac.in
```

It verifies Docker access, that port 3001 is free, disk headroom, that the **existing** nginx config is valid, that your hostnames aren't already claimed by another site file, and that every required env value is present and well-formed.

Then deploy:

```bash
bash deploy/scripts/deploy.sh
```

What it does, in order: pulls `main` → for each frontend, builds it inside a `node:22` container and exports the static files to a temp dir → refuses to continue if a build produced no `index.html` → `rsync --delete` into `/var/www/discovr/<app>` → `docker compose up -d --build` → polls `/ping` until healthy.

First run takes 5–10 minutes (three `npm ci` runs plus image builds). Then:

```bash
docker compose -f deploy/docker/docker-compose.yml ps      # both Up
docker compose -f deploy/docker/docker-compose.yml logs --tail 30 worker   # "Discovr job worker started"
curl -s http://127.0.0.1:3001/ping                          # Service is active
curl -s http://127.0.0.1:3001/ping/db-health                # "status":"ready"
```

`db-health` reporting `unavailable` means Atlas is rejecting the server's IP — Phase 8.1.

`restart: unless-stopped` means both containers come back automatically after a reboot or a Docker restart. There's no PM2 startup step to remember.

---

## Phase 6 — nginx (additive)

Render the template with your hostnames and install it as a **new** file:

```bash
cd /home/ubuntu/discovr
sed -e 's/__STUDENT_HOST__/discovr.iitr.ac.in/g' \
    -e 's/__CLUB_HOST__/club.discovr.iitr.ac.in/g' \
    -e 's/__ADMIN_HOST__/admin.discovr.iitr.ac.in/g' \
    -e 's/__API_HOST__/api.discovr.iitr.ac.in/g' \
    deploy/nginx/discovr.conf.template | sudo tee /etc/nginx/sites-available/discovr.conf > /dev/null

sudo ln -s /etc/nginx/sites-available/discovr.conf /etc/nginx/sites-enabled/discovr.conf
sudo nginx -t                      # MUST pass — if it fails, remove the symlink before doing anything else
sudo systemctl reload nginx        # reload, never restart
```

If `nginx -t` fails, `sudo rm /etc/nginx/sites-enabled/discovr.conf` and re-check. A broken config here takes down every site on the box at the next reload, so never reload without a passing test.

Why the config looks the way it does:

- **`try_files $uri $uri/ /index.html`** — replaces the rewrite from your `vercel.json`. Without it, refreshing on `/event/123` returns 404.
- **`/assets/` cached one year, immutable** — safe because Vite fingerprints those filenames.
- **`firebase-messaging-sw.js` with `must-revalidate`** — reproduces the header from [student/vercel.json](student/vercel.json). Without it, devices keep running a stale push handler.
- **`client_max_body_size 60m`** — [upload.js](backend/src/middlewares/upload.js) allows 5 × 50 MB; nginx's 1 MB default would 413 those before Express saw them.
- **`X-Forwarded-For` / `X-Forwarded-Proto`** — what makes `TRUST_PROXY_HOPS=1` work.
- **No CORS headers** — `app.js` owns CORS; duplicates make browsers reject the response.

### Test before DNS exists

You don't need the records to verify the whole stack — fake the Host header:

```bash
curl -s -H 'Host: api.discovr.iitr.ac.in' http://127.0.0.1/ping
curl -s -H 'Host: discovr.iitr.ac.in' http://127.0.0.1/ | head -5
```

First returns `Service is active`, second your student app's HTML. That confirms everything except TLS.

---

## Phase 7 — HTTPS

HTTPS is mandatory here, not a nicety: sessions are issued with `secure: true, sameSite: "none"` in production ([auth.js](backend/src/utils/auth.js)), so browsers discard them over plain HTTP and **login silently fails**. Push notifications also require a secure origin.

Once `dig` shows all four names resolving to `3.6.91.54`:

```bash
sudo certbot --nginx \
  -d discovr.iitr.ac.in \
  -d club.discovr.iitr.ac.in \
  -d admin.discovr.iitr.ac.in \
  -d api.discovr.iitr.ac.in \
  --agree-tos -m ecell@iitr.ac.in --redirect
```

certbot edits **only your** server blocks — it matches on the `-d` names. The existing certificates and their renewal timer are unaffected.

```bash
sudo certbot certificates | grep -A2 discovr    # confirm issuance
sudo certbot renew --dry-run                    # confirm renewal works
```

If validation fails: DNS not propagated, or port 80 blocked. Let's Encrypt rate-limits failures, so debug with `--dry-run`.

---

## Phase 8 — Point the external services at this server

### 8.1 MongoDB Atlas — the one that will definitely bite you

Atlas rejects connections from IPs it doesn't know, and `3.6.91.54` is new to it.

**Atlas → Network Access → ADD IP ADDRESS →** `3.6.91.54/32`, comment "E-Cell AWS server — Discovr" → Confirm.

Keep the existing Render entries until you decommission Render. If the list contains `0.0.0.0/0`, remove it *after* cutover — that entry means anyone with the connection string can reach your database.

Recheck: `curl -s http://127.0.0.1:3001/ping/db-health`

### 8.2 Firebase

No IP configuration needed — it's outbound HTTPS from the worker container. In the Firebase console check:

- **Project settings → Cloud Messaging** — the Web Push certificate matches `VITE_FIREBASE_VAPID_KEY`
- **Authentication → Settings → Authorized domains** — add the student hostname if you use Firebase Auth

Push subscriptions are per-origin, so students will re-register a token on their first visit to the new domain. Old Vercel-origin tokens go stale on their own.

### 8.3 Resend and Cloudinary

Nothing to change — both are outbound HTTPS APIs, unaffected by where the code runs.

One warning: **EC2 blocks outbound port 25.** Never switch to raw SMTP; stay on the Resend API. (Same for the legacy `sib-api-v3-sdk` Brevo path.)

---

## Phase 9 — Verify before announcing

### From your laptop

```bash
curl -sI http://discovr.iitr.ac.in | head -3           # 301 → https
curl -s  https://api.discovr.iitr.ac.in/ping           # Service is active
curl -s  https://api.discovr.iitr.ac.in/ping/db-health # "status":"ready"
curl -sI https://discovr.iitr.ac.in/some/deep/route | head -1   # 200, not 404

# CORS accepts your origin
curl -si -X OPTIONS https://api.discovr.iitr.ac.in/student/login \
  -H 'Origin: https://discovr.iitr.ac.in' \
  -H 'Access-Control-Request-Method: POST' | head -12

# CORS rejects a foreign origin
curl -s -X OPTIONS https://api.discovr.iitr.ac.in/student/login \
  -H 'Origin: https://evil.example.com' \
  -H 'Access-Control-Request-Method: POST'          # "Origin is not allowed"
```

The successful preflight must carry `access-control-allow-origin` echoing your origin **and** `access-control-allow-credentials: true`. Missing means `ALLOWED_ORIGINS` doesn't match exactly — check for a trailing slash or `http` vs `https`.

### Confirm you broke nothing else

```bash
ssh ecell 'for h in ecelliitr.org esummit.in delta.ecelliitr.org cap.esummit.in; do
  printf "%-28s %s\n" "$h" "$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $h" http://127.0.0.1/)"
done'
docker ps --format '{{.Names}}\t{{.Status}}'    # the 6 pre-existing containers still Up
```

### In a browser

- [ ] Student login → refresh → still logged in (proves the `Secure; SameSite=None` cookie stuck)
- [ ] Club and admin login, same check
- [ ] DevTools → Network: no CORS errors, no mixed content
- [ ] Upload a club logo and a resume → appears in Cloudinary (proves the 60 MB body limit)
- [ ] Student app → allow notifications → Application → Service Workers shows `firebase-messaging-sw.js` **activated**
- [ ] Trigger an email action, watch `docker compose ... logs -f worker`, confirm delivery

---

## Phase 10 — Cutover and rollback

The two stacks are independent — Vercel talks to Render, AWS talks to AWS, both read the same Atlas database. No data migration, no split-brain.

1. Finish Phase 9 with Render and Vercel still live.
2. Soft-launch to a few club members for a day.
3. Announce, and update every link: the E-Cell site, WhatsApp groups, Instagram bio, printed QR codes.
4. Optionally redirect the old Vercel deployments — in each app's `vercel.json`:

```json
{ "redirects": [ { "source": "/(.*)", "destination": "https://discovr.iitr.ac.in/$1", "permanent": false } ] }
```

Keep `permanent: false` — a 308 is cached by browsers effectively forever.

5. Watch for a week: `docker compose ... logs`, `/var/log/nginx/discovr-*.error.log`, Atlas metrics.
6. Decommission: suspend Render, delete the Vercel projects, remove stale Render IPs (and any `0.0.0.0/0`) from the Atlas allowlist.

**Rollback** at any point before step 6: point users back at the old URLs. Nothing else to undo. Keep the old stack alive through at least one full recruitment cycle.

---

## Phase 11 — Running it

```bash
ssh ecell
cd /home/ubuntu/discovr

bash deploy/scripts/deploy.sh                 # deploy latest main
ONLY=student  bash deploy/scripts/deploy.sh   # rebuild one frontend
SKIP_WEB=1    bash deploy/scripts/deploy.sh   # backend only
BRANCH=hotfix bash deploy/scripts/deploy.sh   # deploy another branch
```

`deploy.sh` runs `git reset --hard origin/<branch>` — never edit files directly on the server, they'll be discarded. Change locally, push, deploy.

After changing `backend/.env` (secrets are read at container start):

```bash
docker compose -f deploy/docker/docker-compose.yml up -d
```

After changing a frontend `.env.production` (values are compiled in):

```bash
ONLY=student bash deploy/scripts/deploy.sh
```

### Watching it

```bash
C="docker compose -f /home/ubuntu/discovr/deploy/docker/docker-compose.yml"
$C ps
$C logs -f --tail 100 api
$C logs -f --tail 100 worker
docker stats --no-stream discovr-api discovr-worker
sudo tail -f /var/log/nginx/discovr-api.error.log
df -h /
```

Logs are capped at 20 MB × 5 files per container, so they can't fill the disk.

Add a free UptimeRobot check on `https://api.discovr.iitr.ac.in/ping` every 5 minutes — you'll hear about an outage before students report it.

### Housekeeping on a shared box

```bash
docker builder prune -f                      # safe: cache only
docker image prune -f                        # safe: dangling (untagged) images only
```

Never `docker image prune -a` or `docker system prune -a` — those delete other teams' images.

### Backups

- **Database** — Atlas; confirm backups are enabled for your cluster tier.
- **Secrets** — keep a copy of the four env files in a password manager. If this box dies and the env files die with it, you're rebuilding from Render's dashboard.
- **Server** — an AMI snapshot covers all of E-Cell's apps at once, so coordinate with the admin rather than doing it alone.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `502 Bad Gateway` on api host | Container down, or not bound to 3001 | `docker compose ... ps`, `... logs --tail 50 api` |
| Container restart-loops at boot | Env validation failed | `docker compose ... logs api` prints the exact missing variable |
| *JWT_SECRET must contain at least 32 characters* | Dev secret copied instead of Render's | Copy Render's value, or `openssl rand -base64 48` (logs everyone out) |
| *ADMIN_PASSWORD_HASH is required in production* | `ADMIN_PASSWORD` isn't accepted in prod | Copy the hash from Render, or generate one (Phase 4.1) |
| *Invalid ALLOWED_ORIGINS entry* | Trailing slash, path, or `*` | Bare origins only |
| `MongooseServerSelectionError` / db-health unavailable | `3.6.91.54` not on the Atlas allowlist | Phase 8.1 |
| Browser: CORS blocked | `ALLOWED_ORIGINS` mismatch | Fix env, `docker compose ... up -d` |
| Login works, next request 401 | `SameSite=None` cookie dropped over HTTP | Finish Phase 7 |
| `413 Request Entity Too Large` | nginx body limit below multer's | `client_max_body_size 60m` on the api block |
| Everyone rate-limited at once | Every request looks like `127.0.0.1` | `TRUST_PROXY_HOPS=1`, restart containers |
| Deep-link refresh 404s | SPA fallback missing | `try_files $uri $uri/ /index.html` |
| Frontend calls `localhost:3001` | Built with wrong `.env.production` | Fix it and rebuild — Vite bakes values in |
| Push stops working | Stale service worker | Keep `must-revalidate` on `firebase-messaging-sw.js`; hard-reload |
| Emails never arrive | Worker down, or nothing draining the queue | `docker compose ... logs worker`; confirm `RUN_JOBS_IN_API=false` **and** the worker is Up |
| Build fails: `no space left on device` | Disk at 86% | `docker builder prune -f` |
| `nginx -t` fails after your change | Syntax error or duplicate `server_name` | `sudo rm /etc/nginx/sites-enabled/discovr.conf`, re-test, fix, re-link |
| **Another site broke after your deploy** | Almost certainly the nginx step | Remove your symlink, `nginx -t`, reload — that restores the previous state exactly |

---

## Appendix — Capacity and cost

Nothing new to pay for: this instance is already running and paid for. Your addition is roughly 300–500 MB RAM (two Node containers) out of 15 GB, and ~1.5 GB of disk for images — comfortable, though the disk is the constrained resource at 86% full.

The signals that this box is overloaded — for the admin, not just you: sustained CPU above 70%, disk above 90%, or nginx `error.log` showing upstream timeouts. Options then, in order: reclaim Docker space, move static frontends to S3 + CloudFront, or split heavy apps onto a second instance.

One scaling caveat specific to this app: [rateLimit.js](backend/src/middlewares/rateLimit.js) keeps buckets in process memory backed by a Mongo collection, so running more than one API replica makes the in-memory tier per-replica. Verify that behaviour before scaling out.

---

*Runbook for the Discovr recruitment portal, targeting the shared E-Cell server at 3.6.91.54. Config lives in [deploy/](deploy/) — keep this document updated alongside it.*
