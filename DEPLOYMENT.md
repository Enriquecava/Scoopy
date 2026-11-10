# v0.3.0-rc.1 - Deployment Guide

**Release Date**: November 10, 2026  
**Type**: Release Candidate (Prerelease)  
**Status**: ✅ Ready for Staging Deployment

## ⚠️ Critical Information

This release introduces **irreversible database migrations**. **BACKUP YOUR DATABASE** before proceeding with any step. All breaking changes and new features are documented in [RELEASE_v0.3.0-rc.1.md](./RELEASE_v0.3.0-rc.1.md).

---

## Prerequisites

Before deploying, ensure you have:

### System Requirements
- PostgreSQL 16+ (running and accessible)
- Docker & Docker Compose 2.20+
- 4GB RAM minimum available
- 2GB free disk space (backup storage)
- 10GB free disk space (Docker images)
- macOS, Linux, or Windows with WSL2

### Access & Configuration
- Git repository with `main` branch updated
- `.env` file with PostgreSQL credentials configured
- Docker daemon running
- Network connectivity to `github.com`

### Required Tools
```bash
# Verify installations
docker --version           # Docker 20.10+
docker-compose --version  # Docker Compose 2.20+
git --version             # Git 2.30+
psql --version            # PostgreSQL client 14+
pg_dump --version         # PostgreSQL client 14+
curl --version            # For health checks
```

---

## Step 1: Backup Database

**Duration**: 2-10 minutes (depends on database size)

### 1.1 Prepare Environment

```bash
# Navigate to project root
cd /path/to/Scoopy

# Verify .env configuration
cat .env | grep PG
# Expected output:
# PGHOST=<host>
# PGPORT=<port>
# PGUSER=<user>
# PGPASSWORD=<password>
# PGDATABASE=<database>
```

### 1.2 Test Database Connection

```bash
# Test PostgreSQL connection
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT version();"

# Expected output: PostgreSQL 16.x on...
```

If connection fails:
- ✗ `PGHOST` is incorrect → Update `.env` and check PostgreSQL configuration
- ✗ `PGUSER` or `PGPASSWORD` wrong → Verify PostgreSQL user credentials
- ✗ Connection refused → Ensure PostgreSQL service is running: `pg_ctl status` or `brew services list`

### 1.3 Create Backup

```bash
# Create backup directory
mkdir -p ./.backups

# Create timestamped backup file
BACKUP_FILE="./.backups/scoopy_backup_$(date +%Y%m%d_%H%M%S).sql"

# Backup database (this will take several minutes)
pg_dump \
  -h $PGHOST \
  -U $PGUSER \
  -d $PGDATABASE \
  --compress=9 \
  --format=custom \
  > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

# Verify backup was created
ls -lh "$BACKUP_FILE"
# Expected: -rw-r--r-- user group XXX KB date time $BACKUP_FILE
```

### 1.4 Verify Backup Integrity

```bash
# List backup contents to verify integrity
pg_restore --list "$BACKUP_FILE" | head -20
# Expected: List of database objects (tables, indexes, etc.)

# Test restore capability (optional but recommended)
pg_restore --list "$BACKUP_FILE" > /dev/null && echo "Backup is valid"
# Expected: (no output or "Backup is valid")
```

### 1.5 Document Backup

```bash
# Store backup path for rollback reference
echo "$BACKUP_FILE" > .backups/LATEST_BACKUP

# Display backup summary
du -h "$BACKUP_FILE"
echo "Backup date: $(date)"
echo "Save this file path for potential rollback"
```

**✅ Backup Complete** - Keep this file for at least 48 hours after successful deployment.

---

## Step 2: Pull Latest Code

**Duration**: 1-3 minutes

### 2.1 Verify Git Status

```bash
# Check current branch
git branch
# Expected: * main (or origin/main)

# Verify clean working directory
git status
# Expected: 
# On branch main
# nothing to commit, working tree clean
```

If working directory is dirty:
```bash
# Stash uncommitted changes
git stash

# Or, reset to HEAD
git reset --hard HEAD
```

### 2.2 Fetch Latest Changes

```bash
# Fetch from remote
git fetch origin main

# Show incoming changes
git log main..origin/main --oneline
# Expected: Shows commits from dev merged into main
```

### 2.3 Pull Latest Code

```bash
# Pull main branch
git pull origin main

# Verify current commit
git log -1 --oneline
# Expected: Should show the merge commit for release/v0.3.0-rc.1
```

### 2.4 Verify Tag

```bash
# Verify v0.3.0-rc.1 tag exists
git tag | grep v0.3.0-rc.1
# Expected: v0.3.0-rc.1

# Show tag details
git show v0.3.0-rc.1 --stat
# Expected: Tag information and associated files
```

**✅ Code Updated** - Ready for Docker build.

---

## Step 3: Update Environment Configuration

**Duration**: 5 minutes

### 3.1 Review .env File

```bash
# Display current environment
cat .env

# Expected format:
# PGHOST=<host>
# PGPORT=5432
# PGUSER=<user>
# PGPASSWORD=<password>
# PGDATABASE=<database>
# PLAYWRIGHTHEADLESS=True
# SCRAPER_BATCH_DELAY_MS=3000
```

### 3.2 Remove Deprecated Variables

```bash
# Check for deprecated SCRAPER_LOG_FILE
grep SCRAPER_LOG_FILE .env && echo "Found deprecated variable" || echo "OK"

# If found, remove it
sed -i.bak '/SCRAPER_LOG_FILE/d' .env

# Verify removal
grep SCRAPER_LOG_FILE .env || echo "Deprecated variable removed"
```

### 3.3 Verify Required Variables

```bash
# Check all required variables are set
for var in PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE; do
  value=$(grep "^$var=" .env | cut -d= -f2)
  if [ -z "$value" ]; then
    echo "❌ ERROR: $var not set"
    exit 1
  else
    echo "✓ $var is configured"
  fi
done
```

### 3.4 Test Docker Environment Variables

```bash
# Load environment
source .env

# Test Docker connectivity
docker run --rm alpine echo "Docker is working"
# Expected: Docker is working
```

**✅ Environment Ready** - Configuration verified.

---

## Step 4: Build Docker Images

**Duration**: 5-15 minutes (first build may take longer)

### 4.1 Pull Base Images

```bash
# Update existing images
docker-compose pull

# Expected: Pulling from docker.io/...
```

### 4.2 Build Application Images

```bash
# Build all images without cache
docker-compose build --no-cache api scraper verifier frontend

# This will:
# - Build scoopy-api from Dockerfile
# - Build scoopy-scraper from Dockerfile
# - Build scoopy-verifier (reuses scraper image)
# - Build scoopy-frontend from Dockerfile
```

If build fails:
```bash
# Check specific service build logs
docker-compose build --no-cache api 2>&1 | tail -50

# Common issues:
# - Network connectivity: Check internet connection
# - Disk space: Run "df -h" to check available space
# - Ruby/Node version: Verify Dockerfile versions match requirements
```

### 4.3 Verify Images

```bash
# List built images
docker images | grep scoopy

# Expected output:
# REPOSITORY              TAG       IMAGE ID      CREATED        SIZE
# scoopy-frontend         latest    xxxxxxxxxxxx  X minutes ago   XXX MB
# scoopy-api              latest    xxxxxxxxxxxx  X minutes ago   XXX MB
# scoopy-scraper          latest    xxxxxxxxxxxx  X minutes ago   XXX MB
```

**✅ Images Built** - Ready for database migration.

---

## Step 5: Run Database Migrations

**Duration**: 5-30 minutes (depends on data volume)

### 5.1 Start API Container

```bash
# Start only the API container
docker-compose up -d api

# Monitor startup
docker-compose logs -f api &

# Expected output:
# scoopy-api | Listening on 0.0.0.0:3000
```

### 5.2 Wait for API Readiness

```bash
# Check if API is ready (database migrations will run automatically)
# This may take 2-5 minutes for first run

# Method 1: Direct database check
docker-compose run --rm api bin/rails db:version

# Method 2: HTTP health check
curl -s http://localhost:3000/up | jq .

# Expected output:
# Current version: 20261110000000
```

Wait until you see the migration version output before proceeding.

### 5.3 Manually Run Migrations (if needed)

```bash
# If migrations didn't run automatically, run them manually
docker-compose run --rm api bin/rails db:migrate

# Expected output:
# == 20261109000000 AddProductPresentations: migrating ==========
# == 20261109000000 AddProductPresentations: migrated (X.XXs) ===
# == 20261110000000 PreservePresentationHistory: migrating ==
# == 20261110000000 PreservePresentationHistory: migrated (X.XXs) ==
```

### 5.4 Verify Migration Success

```bash
# Check migration version
docker-compose run --rm api bin/rails runner \
  'puts "Current version: #{ActiveRecord::Base.connection.execute("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").getvalue(0,0)}"'

# Expected: Current version: 20261110000000
```

If migration fails:
```bash
# Check error logs
docker-compose logs api | grep -i "error\|fail"

# Rollback database from backup (see Rollback Guide)
# Contact development team with error messages
```

### 5.5 Check for Orphaned Records

```bash
# Find records that don't have a provider listing
docker-compose run --rm api bin/rails runner \
  'puts "Orphaned prices: #{PriceHistory.where(providers_product_id: nil).count}"; \
   puts "Orphaned incidents: #{ScraperIncident.where(providers_product_id: nil).count}"'

# Expected output:
# Orphaned prices: 0
# Orphaned incidents: 0

# If orphaned records exist, they must be associated via admin API
# See: RELEASE_v0.3.0-rc.1.md (Step 6: Handle Orphaned Records)
```

**✅ Migrations Complete** - Database schema updated successfully.

---

## Step 6: Start All Services

**Duration**: 2-5 minutes

### 6.1 Stop Individual API Container

```bash
# Stop the API container started in Step 5
docker-compose down

# Verify all containers are stopped
docker-compose ps
# Expected: No running containers
```

### 6.2 Start All Services

```bash
# Start all containers (api, scraper, verifier, frontend)
docker-compose up -d

# Display status
docker-compose ps

# Expected output:
# NAME              STATUS
# scoopy-api        Up (healthy)
# scoopy-scraper    Up
# scoopy-verifier   Up
# scoopy-frontend   Up
```

### 6.3 Monitor Startup Logs

```bash
# Follow API logs (wait for health checks)
docker-compose logs -f api &
API_PID=$!

# Monitor for health check success (should complete in ~180 seconds)
# Expected output:
# api | Listening on 0.0.0.0:3000
# api | Health check: OK

# Kill log monitor
kill $API_PID
```

### 6.4 Verify API Health

```bash
# Check API health endpoint
curl -v http://localhost:3000/up

# Expected output:
# HTTP/1.1 200 OK
# {"status":"ok"}

# If connection refused, wait 30 more seconds and retry
sleep 30 && curl http://localhost:3000/up
```

### 6.5 Verify Scraper Connection

```bash
# Check scraper logs for API connection
docker-compose logs scraper | grep -i "api\|connected" | head -10

# Expected output:
# scraper | INFO: Connected to API at http://api:3000
# scraper | INFO: Starting batch processor
```

### 6.6 Verify Verifier Service

```bash
# Check verifier status
docker-compose logs verifier | grep -i "listen\|xvfb" | head -5

# Expected output:
# verifier | INFO: Listening on 0.0.0.0:4000
# verifier | INFO: Xvfb started successfully
```

**✅ Services Running** - All containers are healthy.

---

## Step 7: Verify Functionality

**Duration**: 5-10 minutes

### 7.1 Check Database State

```bash
# Collect statistics from database
docker-compose run --rm api bin/rails runner \
  'puts "Products: #{Product.count}"; \
   puts "Presentations: #{ProductPresentation.count}"; \
   puts "Listings: #{ProvidersProduct.count}"; \
   puts "Brands: #{Brand.count}"; \
   puts "Categories: #{Category.count}"'

# Expected output (non-zero if data exists):
# Products: XXX
# Presentations: XXX
# Listings: XXX
# Brands: XXX
# Categories: XXX
```

### 7.2 Test API Endpoints

```bash
# Get authentication token (from Rails console or test user)
# For testing purposes, use a test JWT token

# Test products endpoint
curl -s -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/products | jq . | head -20

# Test catalogs endpoints (admin access required)
curl -s -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  http://localhost:3000/brands | jq .

curl -s -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  http://localhost:3000/categories | jq .

curl -s -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  http://localhost:3000/unit_measures | jq .
```

### 7.3 Check Logs for Errors

```bash
# Search for error messages
docker-compose logs | grep -i "error\|fail" | head -20

# Expected: Minimal or no errors (warnings are okay)
```

### 7.4 Monitor Resource Usage

```bash
# Check container resource usage
docker stats --no-stream

# Expected reasonable values:
# - API: 200-500 MB memory
# - Scraper: 300-800 MB memory
# - Verifier: 400-1000 MB memory
# - Frontend: 100-300 MB memory
```

### 7.5 Access Web Interface

```bash
# Frontend is accessible at configured URL
# Default: http://localhost (if running behind tunnel)

# Expected:
# - Admin page loads
# - Product list displays
# - Product detail page works
# - Catalog management interface available (admin only)
```

**✅ Functionality Verified** - Application is operational.

---

## Step 8: Monitor for Issues

**Duration**: Ongoing (first 30 minutes post-deployment)

### 8.1 Real-time Monitoring

```bash
# Follow all logs in real-time
docker-compose logs -f

# Monitor specific service
docker-compose logs -f api
docker-compose logs -f scraper
docker-compose logs -f verifier
```

### 8.2 Check Container Health

```bash
# Monitor health check status
watch -n 5 docker-compose ps

# Expected: All services showing "Up (healthy)" or "Up"
```

### 8.3 Look for Known Issues

```bash
# Check for common problems
docker-compose logs | grep -E "WARN|ERROR|Exception" | head -20

# Monitor for the following issues:
# - Database lock timeouts → Increase lock timeout or reduce concurrent operations
# - Memory pressure → Scale up container resources
# - Network connectivity → Check Docker network
# - File permission errors → Check volume ownership
```

### 8.4 Test Critical Workflows

```bash
# 1. Create a new product
# 2. Add a presentation to the product
# 3. Create a provider listing
# 4. Verify data appears in product detail page
# 5. Check that scraper can process the product
# 6. Verify screenshot capture works through verifier
```

**✅ Monitoring Complete** - Ready for acceptance testing.

---

## Post-Deployment Checklist

- [ ] Database backup created and verified
- [ ] Latest code pulled from main branch
- [ ] All Docker images built successfully
- [ ] Database migrations completed without errors
- [ ] No orphaned records found (or handled via admin API)
- [ ] All services are running and healthy
- [ ] API health check passes
- [ ] Scraper connected to API
- [ ] Verifier service operational
- [ ] Frontend accessible
- [ ] Critical workflows tested
- [ ] Logs monitored for errors (first 30 minutes)
- [ ] Backup file stored safely

---

## Useful Commands Reference

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs api
docker-compose logs scraper
docker-compose logs verifier
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f api

# Check service status
docker-compose ps

# Stop services
docker-compose down

# Restart a service
docker-compose restart api

# Enter Rails console
docker-compose run --rm api bin/rails console

# Run Rails commands
docker-compose run --rm api bin/rails db:version
docker-compose run --rm api bin/rails routes

# Check database
docker-compose run --rm api bin/rails dbconsole

# View container resource usage
docker stats

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune
```

---

## Troubleshooting

### Migration Fails with "IrreversibleMigration"
This is **expected behavior**. The migrations are designed to be irreversible to prevent accidental data loss. To roll back, restore from the database backup created in Step 1.

### API Container Keeps Restarting
```bash
# Check API logs
docker-compose logs api

# Common causes:
# 1. Database connection failed → Check .env and PostgreSQL
# 2. Master key missing → Check RAILS_MASTER_KEY in .env
# 3. Gem installation failed → Check Dockerfile and Gemfile
```

### Scraper Cannot Connect to API
```bash
# Verify API is running and healthy
curl http://localhost:3000/up

# Check Docker network
docker network ls
docker network inspect scoopy_backend

# Restart scraper
docker-compose restart scraper
```

### Verifier Service Not Starting
```bash
# Check for X11 issues
docker-compose logs verifier | grep -i xvfb

# Restart verifier
docker-compose restart verifier

# If still failing, check disk space for screenshots
docker exec scoopy-verifier df -h /app/tmp/screenshot
```

### High Memory Usage
```bash
# Check which container is using most memory
docker stats

# Scale down if needed (modify docker-compose.yml)
# Restart container
docker-compose restart [service]
```

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs [service]`
2. Review RELEASE_v0.3.0-rc.1.md for detailed information
3. See Rollback Guide: [DEPLOYMENT_ROLLBACK.md](./DEPLOYMENT_ROLLBACK.md)
4. Contact development team with error messages and logs

**Backup file location**: Check `.backups/LATEST_BACKUP`

---

**Release**: v0.3.0-rc.1  
**Last Updated**: November 10, 2026  
**Status**: Ready for Staging Deployment
