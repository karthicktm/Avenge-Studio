# Railway Deployment Guide

Complete guide for deploying Content Cat to Railway using Docker.

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository connected to Railway
- FAL.ai API key

## Quick Deploy

### 1. Create New Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Select "Deploy from GitHub repo"
3. Choose your Content Cat repository

### 2. Add Database Services

**PostgreSQL:**
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway automatically sets `DATABASE_URL` environment variable

**Redis:**
1. Click "New" → "Database" → "Add Redis"
2. Railway automatically sets `REDIS_URL` environment variable

### 3. Configure Environment Variables

Go to your app service → Variables tab and add:

```bash
# Required - Generate secure random strings
SESSION_SECRET=<generate-random-string>
CRON_SECRET=<generate-random-string>
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

# Required - Your FAL.ai API key
FAL_KEY=<your-fal-api-key>

# Optional - Already set by Railway plugins
DATABASE_URL=<auto-set-by-postgresql-plugin>
REDIS_URL=<auto-set-by-redis-plugin>

# Optional - Defaults are fine
NODE_ENV=production
PORT=3000
```

**To generate secure values:**

```bash
# SESSION_SECRET (64 characters)
openssl rand -base64 48

# CRON_SECRET (32 characters)
openssl rand -base64 24

# ENCRYPTION_KEY (64 hex characters)
openssl rand -hex 32
```

### 4. Deploy

1. Railway will automatically build and deploy using the Dockerfile
2. The startup script (`scripts/start.sh`) will:
   - Wait for database connection
   - Run Prisma migrations
   - Start the Next.js server

### 5. Verify Deployment

1. Check the deployment logs for any errors
2. Visit your Railway-provided URL
3. Health check endpoint: `https://your-app.railway.app/api/health`

## Project Structure

Railway uses these files for deployment:

- `Dockerfile` - Multi-stage build with migrations
- `scripts/start.sh` - Startup script that runs migrations
- `railway.toml` - Railway-specific configuration
- `.dockerignore` - Excludes unnecessary files from build

## Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Auto-set by Railway |
| `REDIS_URL` | No | Redis connection string | Auto-set by Railway |
| `SESSION_SECRET` | Yes | Session encryption key | - |
| `CRON_SECRET` | Yes | Cron job authentication | - |
| `ENCRYPTION_KEY` | Yes | API key encryption (64 hex chars) | - |
| `FAL_KEY` | Yes | FAL.ai API key | - |
| `NODE_ENV` | No | Node environment | `production` |
| `PORT` | No | Server port | `3000` |

## Health Checks

Railway uses `/api/health` endpoint for health checks:

- **Interval:** 30s
- **Timeout:** 10s
- **Start Period:** 5s
- **Retries:** 3

The health check verifies:
- API is responding
- Database connectivity
- Response time

## Troubleshooting

### Build Failures

**Issue:** Docker build fails or times out

**Solutions:**
- Check Railway build logs for specific errors
- Verify `package.json` dependencies are correct
- Ensure `pnpm-lock.yaml` is committed

### Migration Failures

**Issue:** Database migrations fail on startup

**Solutions:**
- Check `DATABASE_URL` is set correctly
- Verify PostgreSQL plugin is running
- Check migration logs in deployment logs
- Manually run migrations: `npx prisma migrate deploy`

### Application Not Starting

**Issue:** App builds but doesn't start

**Solutions:**
- Check all required environment variables are set
- Verify `start.sh` has execute permissions
- Check Redis is running (for session storage)
- Review application logs for errors

### Connection Issues

**Issue:** Cannot connect to database or Redis

**Solutions:**
- Verify Railway plugins are running
- Check `DATABASE_URL` and `REDIS_URL` are set
- Ensure services are in the same Railway project
- Check network/firewall settings

## Scaling

Railway supports horizontal and vertical scaling:

**Vertical Scaling:**
- Adjust resources in Railway dashboard
- No code changes needed

**Horizontal Scaling:**
- Add multiple replicas in Railway settings
- Sessions work across instances (Redis-backed)

## Monitoring

**Railway Dashboard:**
- Deployment logs
- Resource usage (CPU, memory, network)
- Request metrics
- Error tracking

**Application Metrics:**
- Health endpoint: `/api/health`
- Returns database latency and status
- Custom monitoring can be added

## CI/CD

Railway automatically deploys on:
- Git push to main branch (default)
- Manual deploys from dashboard
- GitHub Actions integration

**Custom Deploy Triggers:**
Configure in Railway dashboard → Settings → Deploy Triggers

## Costs

Railway pricing includes:
- Free tier: $5 credit/month
- Hobby plan: $5/month + usage
- Pro plan: $20/month + usage

**Cost Optimization:**
- Use shared databases for development
- Monitor resource usage in dashboard
- Set usage limits in settings

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Project Issues: GitHub Issues

## Next Steps

After successful deployment:

1. **Set up custom domain** (Railway Settings → Domains)
2. **Configure monitoring** (Sentry, LogRocket, etc.)
3. **Enable automatic backups** (PostgreSQL plugin settings)
4. **Review security** (Environment variables, secrets)
5. **Test all features** (Image/video generation, workflows)

---

For local development setup, see main README.md
