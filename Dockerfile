# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/api-spec/package.json        lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-zod/package.json         lib/api-zod/
COPY lib/db/package.json              lib/db/
COPY artifacts/api-server/package.json  artifacts/api-server/
COPY artifacts/ai-workspace/package.json artifacts/ai-workspace/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Build frontend
RUN BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/ai-workspace run build

# Build backend
RUN pnpm --filter @workspace/api-server run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/api-spec/package.json        lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-zod/package.json         lib/api-zod/
COPY lib/db/package.json              lib/db/
COPY artifacts/api-server/package.json  artifacts/api-server/

RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/artifacts/api-server/dist       artifacts/api-server/dist
COPY --from=builder /app/artifacts/ai-workspace/dist/public artifacts/ai-workspace/dist/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
