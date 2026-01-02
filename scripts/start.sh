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
echo "1/3 Checking database connection..."
# Wait for database to be ready (max 30 seconds)
timeout=30
counter=0
until node -e "require('./node_modules/@prisma/client').PrismaClient().then(c => c.\$connect()).catch(() => process.exit(1))" 2>/dev/null || [ $counter -eq $timeout ]; do
  counter=$((counter + 1))
  echo "Waiting for database... ($counter/$timeout)"
  sleep 1
done

if [ $counter -eq $timeout ]; then
  echo "ERROR: Database connection timeout"
  exit 1
fi

echo "✓ Database is ready"

echo ""
echo "2/3 Running database migrations..."
npx prisma migrate deploy

echo "✓ Migrations completed"

echo ""
echo "3/3 Starting Next.js server..."
echo "========================================="
echo ""

# Start the Next.js server
exec node server.js
