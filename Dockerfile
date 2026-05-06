FROM node:22-slim AS base

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source and build
COPY tsconfig.json ./
COPY src/ src/
COPY public/ public/
COPY test-data/ test-data/

# Install dev deps for build only, compile, then prune
RUN npm ci && npx tsc -p tsconfig.json && npm prune --omit=dev

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/server.js"]
