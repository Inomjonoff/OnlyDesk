FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.30.2 turbo

FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @nexusdesk/api prisma:generate || true
RUN pnpm turbo run build --filter=@nexusdesk/api...

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/services/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
