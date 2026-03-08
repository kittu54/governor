#!/bin/sh
set -e

cd /app/apps/api

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Governor API..."
exec node /app/apps/api/dist/server.js
