SHELL := /bin/bash

DATABASE_URL ?= postgresql://postgres:postgres@localhost:5432/governor?schema=public
PNPM := COREPACK_HOME=/tmp/corepack corepack pnpm
PRISMA_ENV := DATABASE_URL='$(DATABASE_URL)' XDG_CACHE_HOME=/tmp PRISMA_ENGINES_CACHE_DIR=/tmp/prisma-engines
COMPOSE ?= docker-compose

.PHONY: all ensure-env bootstrap install infra db-create prisma-generate prisma-migrate seed test dev down logs

all: bootstrap

ensure-env:
	@[ -f .env ] || cp .env.example .env
	@echo ".env ready."

bootstrap: ensure-env install infra db-create prisma-generate prisma-migrate seed test
	@echo "Governor bootstrap complete."

install:
	@CI=1 $(PNPM) install --frozen-lockfile

infra:
	@$(COMPOSE) up -d postgres redis
	@echo "Waiting for Postgres to become ready..."
	@for i in {1..60}; do \
		if docker exec governor-postgres pg_isready -U postgres >/dev/null 2>&1; then \
			echo "Postgres is ready."; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "Postgres did not become ready in time."; \
	exit 1

db-create:
	@docker exec governor-postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='governor'" | grep -q 1 || docker exec governor-postgres psql -U postgres -c "CREATE DATABASE governor;"
	@echo "Database governor exists."

prisma-generate:
	@$(PRISMA_ENV) $(PNPM) --filter @governor/api prisma:generate

prisma-migrate:
	@$(PRISMA_ENV) $(PNPM) --filter @governor/api exec prisma migrate dev --name init --skip-generate

seed:
	@DATABASE_URL='$(DATABASE_URL)' $(PNPM) --filter @governor/api prisma:seed

test:
	@$(PNPM) --filter @governor/shared build
	@$(PNPM) --filter @governor/policy-engine build
	@$(PNPM) --filter @governor/policy-engine test
	@$(PNPM) --filter @governor/api test

dev: ensure-env
	@echo "Starting API (4000) and Console (3000)..."
	@set -a; \
		[ -f .env ] && source .env; \
		set +a; \
		: "$${DATABASE_URL:=$(DATABASE_URL)}"; \
		: "$${REDIS_URL:=redis://localhost:6379}"; \
		: "$${NEXT_PUBLIC_API_BASE_URL:=http://localhost:4000}"; \
		trap 'kill 0' INT TERM EXIT; \
		DATABASE_URL="$$DATABASE_URL" REDIS_URL="$$REDIS_URL" $(PNPM) --filter @governor/api dev & \
		NEXT_PUBLIC_API_BASE_URL="$$NEXT_PUBLIC_API_BASE_URL" $(PNPM) --filter @governor/console dev & \
		wait

down:
	@$(COMPOSE) down

logs:
	@$(COMPOSE) logs -f
