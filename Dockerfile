# ---- Build stage ----
FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install build tools required by better-sqlite3 native addon
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Compile TypeScript
RUN pnpm --filter @solanaidle/api build

# Create self-contained production bundle (resolves workspace deps)
RUN pnpm --filter @solanaidle/api deploy --prod /deploy

# ---- Production stage ----
FROM node:22-alpine AS production

WORKDIR /app

# Copy self-contained bundle (node_modules + dist)
COPY --from=build /deploy .

# SQLite data lives here — mount a named volume to persist across restarts
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
