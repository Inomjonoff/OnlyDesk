FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nexusdesk/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/services/api
EXPOSE 4000
CMD ["pnpm", "start"]
