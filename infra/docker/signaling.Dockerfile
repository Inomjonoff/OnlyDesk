FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.30.2

FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @nexusdesk/types build
RUN pnpm --filter @nexusdesk/config build
RUN pnpm --filter @nexusdesk/crypto build
RUN pnpm --filter @nexusdesk/protocol build
RUN pnpm --filter @nexusdesk/validation build
RUN pnpm --filter @nexusdesk/signaling build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/services/signaling
EXPOSE 4001
CMD ["pnpm", "start"]
