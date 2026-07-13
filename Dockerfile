# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/api-spec/package.json          lib/api-spec/
COPY lib/api-client-react/package.json  lib/api-client-react/
COPY lib/db/package.json                lib/db/
COPY artifacts/api-server/package.json  artifacts/api-server/
COPY artifacts/ai-workspace/package.json artifacts/ai-workspace/

RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend (BASE_PATH=/ for single-origin serving)
RUN BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/ai-workspace run build

# Build backend
RUN pnpm --filter @workspace/api-server run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/api-spec/package.json          lib/api-spec/
COPY lib/api-client-react/package.json  lib/api-client-react/
COPY lib/db/package.json                lib/db/
COPY artifacts/api-server/package.json  artifacts/api-server/

RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/artifacts/api-server/dist  artifacts/api-server/dist
COPY --from=builder /app/artifacts/ai-workspace/dist/public artifacts/ai-workspace/dist/public

# Drizzle schema (needed at runtime for migrations)
COPY lib/db/src lib/db/src
COPY lib/db/drizzle lib/db/drizzle 2>/dev/null || true

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
