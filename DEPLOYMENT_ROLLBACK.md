# v0.3.0-rc.1 - Rollback Guide

**Release Date**: November 10, 2026  
**Type**: Recovery Procedure  
**Status**: ⚠️ Emergency Use Only

---

## ⚠️ Before You Rollback

**This guide should only be used if deployment fails or critical issues are discovered.**

### Consider First
1. **Check logs** for specific errors: `docker-compose logs [service]`
2. **Attempt fixes** if the issue is service-specific (e.g., restart container)
3. **Contact development team** for guidance if unsure
4. **Verify backup integrity** before proceeding with rollback

---

## Prerequisites for Rollback

Before rolling back, you must have:

### Required Items
- Backup file from pre-deployment (created in DEPLOYMENT.md Step 1)
- Git access to the repository
- Docker & Docker Compose running
- PostgreSQL credentials in `.env`
- At least 10GB free disk space (Docker images + backup)

### Locate Your Backup

The backup file should be in one of these locations:

```bash
# Check .backups directory
ls -lh .backups/
# Expected: scoopy_backup_YYYYMMDD_HHMMSS.sql

# Or check LATEST_BACKUP reference
cat .backups/LATEST_BACKUP
# Expected: ./.backups/scoopy_backup_YYYYMMDD_HHMMSS.sql
```

If you **cannot find the backup**:
- Check your `.backups/` folder with `find . -name "*.sql" -type f`
- Check recent downloads folder
- Contact your backup administrator
- **Do NOT proceed without a valid backup**

---

## Rollback Procedure

### Step 1: Prepare for Rollback

**Duration**: 2 minutes

#### 1.1 Verify Backup Integrity

```bash
# Navigate to project root
cd /path/to/Scoopy

# Set backup file path
BACKUP_FILE="./.backups/scoopy_backup_YYYYMMDD_HHMMSS.sql"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found at $BACKUP_FILE"
  exit 1
fi

# Show backup file info
ls -lh "$BACKUP_FILE"

# Verify backup is readable and valid
pg_restore --list "$BACKUP_FILE" > /dev/null && echo "✓ Backup is valid" || echo "✗ Backup is corrupted"
```

#### 1.2 Confirm Rollback Intent

```bash
# Display what will be rolled back
echo "⚠️  ROLLBACK WARNING ⚠️"
echo ""
echo "Current state will be DISCARDED:"
echo "  - Current v0.3.0-rc.1 database"
echo "  - Any changes made since deployment"
echo ""
echo "Database will be restored to:"
echo "  - Backup file: $BACKUP_FILE"
echo "  - Pre-v0.3.0-rc.1 schema"
echo ""
echo "Git will checkout to:"
echo "  - Version: v0.2.7-rc.1 (previous stable)"
echo ""
read -p "Type 'CONFIRM ROLLBACK' to proceed: " confirmation
if [ "$confirmation" != "CONFIRM ROLLBACK" ]; then
  echo "Rollback cancelled"
  exit 0
fi
```

#### 1.3 Load Environment Variables

```bash
# Source .env file
source .env

# Verify PostgreSQL connection
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT version();" > /dev/null
if [ $? -ne 0 ]; then
  echo "ERROR: Cannot connect to PostgreSQL"
  echo "Check PGHOST, PGUSER, PGPASSWORD in .env"
  exit 1
fi

echo "✓ PostgreSQL connection verified"
```

**✅ Rollback Preparation Complete** - Ready to proceed.

---

### Step 2: Stop Services

**Duration**: 1 minute

#### 2.1 Stop All Containers

```bash
# Stop all running containers
docker-compose down

# Verify containers are stopped
docker-compose ps

# Expected output: (empty list or "No services running")
```

#### 2.2 Verify Services Are Stopped

```bash
# Double-check no containers are running
docker ps | grep scoopy || echo "✓ All Scoopy containers stopped"

# Wait a few seconds for graceful shutdown
sleep 5
```

**✅ Services Stopped** - Ready to restore database.

---

### Step 3: Restore Database

**Duration**: 5-30 minutes (depends on backup size and database speed)

#### 3.1 Drop Current Database

```bash
# ⚠️ DESTRUCTIVE OPERATION - This CANNOT be undone without backup

# Show databases before dropping
psql -h $PGHOST -U $PGUSER -l | grep $PGDATABASE

# Drop the database (with confirmation)
echo "Dropping database: $PGDATABASE"
psql -h $PGHOST -U $PGUSER -tc "DROP DATABASE IF EXISTS $PGDATABASE;" 2>&1

# Verify database is dropped
psql -h $PGHOST -U $PGUSER -l | grep $PGDATABASE || echo "✓ Database dropped"

# Create empty database for restore
echo "Creating empty database for restore..."
psql -h $PGHOST -U $PGUSER -c "CREATE DATABASE $PGDATABASE WITH ENCODING='UTF8';"

# Verify new database exists
psql -h $PGHOST -U $PGUSER -l | grep $PGDATABASE
# Expected: scoopy_dev    | <owner> | UTF8 | ...
```

#### 3.2 Restore from Backup

```bash
# Start restore process (this will take several minutes)
echo "Restoring database from backup..."
echo "Backup file: $BACKUP_FILE"
echo "This may take 5-30 minutes depending on backup size..."
echo ""

# Restore with progress indication
pg_restore \
  -h $PGHOST \
  -U $PGUSER \
  --no-owner \
  --no-privileges \
  --verbose \
  -d $PGDATABASE \
  "$BACKUP_FILE" 2>&1 | tail -20

# Show completion
echo ""
echo "✓ Database restore completed"
```

#### 3.3 Verify Restore

```bash
# Verify database has data
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT COUNT(*) FROM products;"
# Expected: count > 0 (or 0 if no products in backup)

# Verify migration version is from v0.2.7-rc.1
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# Expected output (from v0.2.7-rc.1):
# version
# --------
# 20260905000008
# (NOT 20261109000000 or 20261110000000 from v0.3.0-rc.1)

# If migration version is v0.3.0-rc.1, restore failed - try again
if psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c \
  "SELECT version FROM schema_migrations WHERE version IN ('20261109000000', '20261110000000');" | grep -q "1 row"; then
  echo "ERROR: Database still has v0.3.0-rc.1 migrations"
  echo "Restore failed. Check backup file validity."
  exit 1
fi
```

**✅ Database Restored** - Ready to checkout previous version.

---

### Step 4: Checkout Previous Version

**Duration**: 1 minute

#### 4.1 Fetch Previous Version Tag

```bash
# Ensure git is up-to-date with tags
git fetch origin --tags

# Verify v0.2.7-rc.1 tag exists
git tag | grep v0.2.7-rc.1
# Expected: v0.2.7-rc.1
```

#### 4.2 Checkout Previous Version

```bash
# Show current commit
echo "Current commit:"
git log -1 --oneline

# Checkout v0.2.7-rc.1
git checkout v0.2.7-rc.1

# Verify checkout
echo "New commit:"
git log -1 --oneline
# Expected: Should show v0.2.7-rc.1 tag message
```

#### 4.3 Verify Code Checkout

```bash
# Verify current version matches checked-out tag
git describe --tags
# Expected: v0.2.7-rc.1

# Verify Dockerfiles are from previous version
grep -i "FROM ruby" scoopy-api/Dockerfile | head -1
grep -i "FROM node" scraper/Dockerfile | head -1
# Expected: Should show base images compatible with v0.2.7-rc.1
```

**✅ Version Reverted** - Ready to rebuild Docker images.

---

### Step 5: Rebuild Docker Images

**Duration**: 5-15 minutes

#### 5.1 Clean Up Old Images (Optional)

```bash
# List current images
docker images | grep scoopy
# Shows v0.3.0-rc.1 images

# Option A: Keep old images (useful if re-deploying v0.3.0-rc.1 later)
# Skip this step

# Option B: Remove old images to free space
docker rmi scoopy-api scoopy-scraper scoopy-frontend
```

#### 5.2 Rebuild Images for v0.2.7-rc.1

```bash
# Build all images without cache
docker-compose build --no-cache api scraper verifier frontend

# This will rebuild from the Dockerfiles now checked out to v0.2.7-rc.1
```

#### 5.3 Verify Images

```bash
# List images
docker images | grep scoopy

# Verify image timestamps are recent
docker inspect scoopy-api:latest | grep '"Created"'
# Expected: Should show a recent timestamp (just now)
```

**✅ Images Rebuilt** - Ready to restart services.

---

### Step 6: Restart Services

**Duration**: 2-5 minutes

#### 6.1 Start Services

```bash
# Start all services
docker-compose up -d

# Monitor startup
docker-compose logs -f api &
LOG_PID=$!

# Wait for API to be ready (should see "Listening on 0.0.0.0:3000")
sleep 30

# Stop log monitoring
kill $LOG_PID 2>/dev/null || true
```

#### 6.2 Verify Services Are Running

```bash
# Check service status
docker-compose ps

# Expected output:
# NAME              STATUS
# scoopy-api        Up (healthy)
# scoopy-scraper    Up
# scoopy-verifier   Up
# scoopy-frontend   Up
```

#### 6.3 Health Checks

```bash
# Test API health
curl -v http://localhost:3000/up
# Expected: HTTP/1.1 200 OK

# Check scraper logs
docker-compose logs scraper | grep -i "connected\|error" | head -5

# Check verifier logs
docker-compose logs verifier | grep -i "listening\|error" | head -5
```

**✅ Services Restarted** - Application is back online.

---

### Step 7: Verify Data Integrity

**Duration**: 5 minutes

#### 7.1 Verify Database State

```bash
# Check if data was restored correctly
docker-compose run --rm api bin/rails runner \
  'puts "Products: #{Product.count}"; \
   puts "Providers Products: #{ProvidersProduct.count}"; \
   puts "Price Histories: #{PriceHistory.count}"'

# Expected: Should match data counts from before v0.3.0-rc.1 deployment
```

#### 7.2 Verify No v0.3.0-rc.1 Tables Exist

```bash
# Check database schema
docker-compose run --rm api bin/rails dbconsole <<EOF
\dt
EOF

# Verify the following v0.3.0-rc.1 specific tables do NOT exist:
# - product_presentations
# - brands
# - categories
# - units
# - unit_measures

# If any of these tables exist, restore failed
```

#### 7.3 Test API Endpoints

```bash
# Test products endpoint
curl -s -H "Authorization: Bearer TEST_TOKEN" \
  http://localhost:3000/products | jq . | head -20

# Expected: Should work without errors
```

**✅ Data Verified** - Rollback is complete and successful.

---

## Rollback Completion Checklist

- [ ] Backup file located and verified
- [ ] PostgreSQL connection confirmed
- [ ] Backup integrity verified with `pg_restore --list`
- [ ] All containers stopped (`docker-compose down`)
- [ ] Database dropped (old v0.3.0-rc.1 data)
- [ ] Empty database created for restore
- [ ] Database restored from backup
- [ ] Restore verified (migration version is v0.2.7-rc.1)
- [ ] Git checked out to v0.2.7-rc.1
- [ ] Docker images rebuilt for v0.2.7-rc.1
- [ ] All services started (`docker-compose up -d`)
- [ ] Services are healthy (all containers showing "Up")
- [ ] API health check passes (`curl http://localhost:3000/up`)
- [ ] Database data verified (product count matches)
- [ ] v0.3.0-rc.1 specific tables do not exist
- [ ] API endpoints respond normally

---

## Post-Rollback Steps

After successful rollback, take these additional steps:

### 1. Document the Issue

```bash
# Create an issue report with:
# - What failed in v0.3.0-rc.1
# - At what step the failure occurred
# - Error messages and logs
# - Database state before rollback
# - Steps to reproduce

# Export logs for analysis
docker-compose logs > /tmp/rollback_logs_$(date +%Y%m%d_%H%M%S).txt
echo "Logs saved to /tmp/rollback_logs_*.txt"
```

### 2. Preserve Backup

```bash
# Keep backup file for investigation
# Move to safe location with timestamp
BACKUP_LOCATION=$HOME/Scoopy_Backups

mkdir -p "$BACKUP_LOCATION"
cp "$BACKUP_FILE" "$BACKUP_LOCATION/v030rc1_rollback_$(date +%Y%m%d_%H%M%S).sql"

echo "Backup preserved at: $BACKUP_LOCATION"
```

### 3. Contact Development Team

Share the following information:
- Backup file path
- Error messages from Step 5 (Docker build or migrations)
- Logs from `docker-compose logs`
- Timeline of what was done before rollback
- Result of `git describe --tags` and `git log -1 --oneline`

### 4. Planning Next Deployment

Before attempting to redeploy v0.3.0-rc.1:
- [ ] Review the issue and root cause
- [ ] Implement fixes if needed
- [ ] Test fixes in development environment
- [ ] Create a new pre-release tag if fixes are needed
- [ ] Follow DEPLOYMENT.md steps again

---

## Emergency Contact

If rollback fails or data is lost:

1. **Stop all operations** - Do not make further changes
2. **Preserve current state** - Export logs and database state
3. **Escalate immediately** - Contact:
   - Development lead
   - Database administrator
   - DevOps team
4. **Involve backup vendor** - If using managed database backups

---

## Troubleshooting Rollback Issues

### Problem: "Backup file corrupted"

```bash
# The backup file may be incomplete or damaged

# Check file integrity
file "$BACKUP_FILE"
# Expected: "pg_restore archive"

# Check file size
ls -lh "$BACKUP_FILE"
# If size is very small (< 1MB), backup is likely incomplete

# Solution:
# - Look for another backup file
# - Contact backup administrator
# - Consider restore from filesystem snapshot if available
```

### Problem: "pg_restore command not found"

```bash
# PostgreSQL client tools are not installed

# Install PostgreSQL client
brew install postgresql  # macOS
apt-get install postgresql-client  # Linux
choco install postgresql  # Windows

# Or use Docker container
docker run --rm -e PGPASSWORD=$PGPASSWORD postgres:16 \
  pg_restore -h $PGHOST -U $PGUSER -d $PGDATABASE < "$BACKUP_FILE"
```

### Problem: "Database restore appears stuck"

```bash
# Monitor restore progress
du -sh /var/lib/postgresql/  # Check disk usage (macOS/Linux)

# Check if process is running
ps aux | grep pg_restore

# Give restore more time (can take 30+ minutes for large backups)
# Or kill and try again with a smaller window

# If truly hung, kill process
kill -9 $(pgrep pg_restore)

# Then try restore again
```

### Problem: "Git checkout fails"

```bash
# Working directory has uncommitted changes

# Stash changes
git stash

# Then checkout again
git checkout v0.2.7-rc.1

# Or hard reset
git reset --hard HEAD
git checkout v0.2.7-rc.1
```

### Problem: "Docker build fails"

```bash
# Check Docker disk space
docker system df

# Free up space if needed
docker image prune -a  # Remove unused images
docker volume prune    # Remove unused volumes

# Check Docker build logs
docker-compose build --no-cache api 2>&1 | tail -50

# Rebuild with more verbosity
docker build --progress=plain --no-cache -f scoopy-api/Dockerfile scoopy-api
```

### Problem: "API will not start after restore"

```bash
# Check API logs for specific errors
docker-compose logs api | tail -100

# Common issues:
# 1. Database connection failed
#    - Verify PGHOST, PGUSER, PGPASSWORD in .env
#    - Check PostgreSQL is running: psql -h $PGHOST -U $PGUSER -d postgres

# 2. Master key missing
#    - RAILS_MASTER_KEY must be in environment
#    - Check scoopy-api/config/credentials.yml.enc

# 3. Gem version mismatch
#    - Run `bundle update`
#    - Rebuild Docker image

# Try manual restore
docker-compose run --rm api bin/rails db:version
docker-compose run --rm api bin/rails console
```

---

## Success Indicators

After rollback is complete, you should observe:

✅ **API is running and healthy**
- `curl http://localhost:3000/up` returns 200 OK

✅ **Database is restored**
- Product count from before v0.3.0-rc.1 is present
- No v0.3.0-rc.1 specific tables exist
- Schema version is v0.2.7-rc.1

✅ **Services are communicating**
- Scraper logs show connection to API
- Verifier is listening on port 4000
- Frontend is accessible

✅ **No critical errors in logs**
- `docker-compose logs | grep -i "error"` returns minimal results
- Services are not restarting repeatedly

---

## Additional Resources

- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Release Notes**: [RELEASE_v0.3.0-rc.1.md](./RELEASE_v0.3.0-rc.1.md)
- **Product Model Design**: [docs/product-model-design.md](./docs/product-model-design.md)

---

**Rollback Version**: v0.2.7-rc.1  
**Release Being Rolled Back**: v0.3.0-rc.1  
**Last Updated**: November 10, 2026  
**Status**: Ready for Emergency Use
