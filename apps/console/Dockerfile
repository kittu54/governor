FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/console/package.json apps/console/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --filter @governor/console... --filter @governor/shared --no-frozen-lockfile

COPY . .

RUN pnpm --filter @governor/shared build
RUN pnpm --filter @governor/console build

FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY --from=builder /app .

EXPOSE 3000
CMD ["pnpm", "--filter", "@governor/console", "start"]
