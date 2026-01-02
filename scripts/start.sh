#!/bin/sh
# ══════════════════════════════════════════════════════════════════════════════
# Content Cat - Production Startup Script
# Runs database migrations before starting the Next.js server
# ══════════════════════════════════════════════════════════════════════════════

set -e

echo "========================================="
echo "Content Cat - Starting Application"
echo "========================================="

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo ""
echo "1/2 Running database migrations..."
# Prisma will handle database connection and wait internally
# If database isn't ready, migrations will fail with a clear error
npx prisma migrate deploy

echo "✓ Migrations completed"

echo ""
echo "2/2 Starting Next.js server..."
echo "========================================="
echo ""

# Start the Next.js server
exec node server.js
