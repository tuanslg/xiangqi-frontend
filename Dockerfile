# syntax=docker/dockerfile:1
# Build on / for linux/amd64 (the Pikafish release used here only ships an x86-64 Linux binary).
# On Apple Silicon: docker build --platform linux/amd64 .

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci

# Frontend (-> /app/dist) and server bundle (-> /app/packages/server/dist; the shared engine is bundled in).
FROM deps AS build
COPY . .
RUN npm run build && npm run build -w @xiangqi/server

# Pikafish binary + NNUE network, pinned and checksum-verified by the script.
FROM node:22-bookworm-slim AS engine
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates p7zip-full \
 && rm -rf /var/lib/apt/lists/*
COPY packages/server/scripts/fetch-pikafish.sh /fetch-pikafish.sh
RUN /fetch-pikafish.sh /engine

# Runtime dependencies of the server only.
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci --omit=dev --workspace @xiangqi/server

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3001 \
    WEB_DIR=/app/web \
    PIKAFISH_PATH=/app/engine/pikafish \
    PIKAFISH_EVAL=/app/engine/pikafish.nnue
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/server/dist ./server/dist
COPY packages/server/migrations ./server/migrations
COPY --from=build /app/dist ./web
COPY --from=engine /engine ./engine
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
