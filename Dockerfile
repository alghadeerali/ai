FROM node:22-slim

# Match the pnpm version that generated the lockfile
RUN npm install -g pnpm@10.26.1

WORKDIR /app

# Copy everything (single-stage keeps the workspace intact for pnpm)
COPY . .

# Install all deps (build tools included)
RUN pnpm install --frozen-lockfile

# Build frontend (single-origin) and backend
RUN BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/ai-workspace run build
RUN pnpm --filter @workspace/api-server run build

# Drop dev dependencies to slim the image
RUN pnpm prune --prod || true

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
