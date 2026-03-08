#!/bin/sh
set -e

echo "Running Prisma migrations..."
pnpm dlx prisma migrate deploy

echo "Starting Governor API..."
node dist/server.js
