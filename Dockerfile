# ══════════════════════════════════════════════════════════════════════════════
# Content Cat - Production Dockerfile
# Multi-stage build for optimal image size
# ══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client (needed for runtime and migrations)
RUN pnpm prisma generate

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage (includes generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Accept build args for environment variables needed during build
ARG DATABASE_URL
ARG REDIS_URL
ARG SESSION_SECRET
ARG CRON_SECRET
ARG ENCRYPTION_KEY
ARG FAL_KEY

# Set build-time environment variables
ENV DATABASE_URL=${DATABASE_URL}
ENV REDIS_URL=${REDIS_URL}
ENV SESSION_SECRET=${SESSION_SECRET:-build-time-secret}
ENV CRON_SECRET=${CRON_SECRET:-build-time-secret}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY:-build-time-key}
ENV FAL_KEY=${FAL_KEY:-}

RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Runner
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl curl

WORKDIR /app

# Install pnpm for running migrations
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files for Prisma migrations
COPY --from=builder /app/prisma ./prisma

# Install only Prisma packages needed for migrations (without package.json to avoid installing everything)
# Create minimal package.json just for Prisma
RUN echo '{"name":"app","version":"1.0.0"}' > package.json && \
    pnpm add prisma@7.2.0 @prisma/client@7.2.0 && \
    npx prisma generate && \
    chown -R nextjs:nodejs /app/node_modules /app/prisma

# Copy application files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy startup script
COPY --chown=nextjs:nodejs scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Create uploads directory with proper permissions for the nextjs user
# Note: Railway filesystem is ephemeral - files are lost on redeploy
# For production, consider using cloud storage (S3, Cloudinary, etc.)
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["./start.sh"]
