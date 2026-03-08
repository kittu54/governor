FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/policy-engine/package.json packages/policy-engine/

RUN pnpm install --filter @governor/api... --filter @governor/shared --filter @governor/policy-engine --no-frozen-lockfile

COPY . .

RUN pnpm --filter @governor/shared build
RUN pnpm --filter @governor/policy-engine build
RUN pnpm --filter @governor/api prisma:generate
RUN pnpm --filter @governor/api build

FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY --from=builder /app .

COPY apps/api/start.sh /app/apps/api/start.sh
RUN chmod +x /app/apps/api/start.sh

EXPOSE 4000
CMD ["/app/apps/api/start.sh"]
