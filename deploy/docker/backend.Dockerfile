# syntax=docker/dockerfile:1
# Discovr API + job worker. One image, two containers (different CMD).
#
# bookworm-slim rather than alpine: bcrypt ships prebuilt glibc binaries, so
# there is no node-gyp toolchain to install and no musl source build.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./

# Secrets arrive via env_file at run time, never baked into the image.
# .dockerignore excludes **/.env so a stray file cannot leak in either.
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
