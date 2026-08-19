# syntax=docker/dockerfile:1
# Builds one Vite SPA and exports the static files — no runtime container.
#
#   docker build -f deploy/docker/frontend.Dockerfile \
#     --build-arg APP=student --target export \
#     --output type=local,dest=/tmp/student-dist .
#
# The host's nginx then serves the exported directory. This keeps the build off
# the host's Node 20 entirely while avoiding a third long-running container.
FROM node:22-bookworm-slim AS builder
ARG APP
WORKDIR /build

COPY ${APP}/package.json ${APP}/package-lock.json ./
RUN npm ci

# Includes .env.production, which Vite inlines at build time.
COPY ${APP}/ ./
RUN NODE_OPTIONS=--max-old-space-size=1024 npm run build

# Nothing but the built assets — no node_modules, no source, no env file.
FROM scratch AS export
COPY --from=builder /build/dist /
