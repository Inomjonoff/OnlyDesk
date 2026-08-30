FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.30.2 turbo

FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm turbo run build --filter=@nexusdesk/signaling...

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/services/signaling
EXPOSE 4001
CMD ["node", "dist/index.js"]
