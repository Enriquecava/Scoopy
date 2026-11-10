# v0.3.0-rc.1 Release Notes (Prerelease)

**Release Date:** November 10, 2026  
**Release Type:** Release Candidate (Prerelease)

## Overview

This prerelease introduces a major refactoring of the product data model to support multiple product presentations and provider listings. This is **not suitable for production** until moved to a stable release. Database migrations are **irreversible** — backup before deploying.

## ⚠️ Breaking Changes

### Product Schema Restructuring
- **Products model transformation**: Products now have required `name` and optional `brand` and `category` references.
- **Product Presentations**: Each product has one or more presentations representing different packaging or quantity variants (e.g., pack of 10, 15, 30 units).
- **Provider Listings**: Provider-product relationships are now per-presentation, allowing a single provider to list the same product in multiple presentations.
- **Data Model Impact**: 
  - New tables: `brands`, `categories`, `units`, `unit_measures`, `product_presentations`
  - Modified tables: `products`, `providers_products`, `price_histories`, `scraper_incidents`
  - Foreign key constraints now include presentation IDs

### API Changes
- **Product detail response** now includes presentation and listing IDs
- **New endpoints**:
  - `GET /brands`, `GET /categories`, `GET /unit_measures` — Read catalogs (authenticated)
  - `POST /brands`, `PATCH /brands/:id`, `DELETE /brands/:id` — Manage brands (admin only)
  - `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` — Manage categories (admin only)
  - `POST /unit_measures`, `PATCH /unit_measures/:id`, `DELETE /unit_measures/:id` — Manage units of measure (admin only)
  - `POST /products/:product_id/presentations`, `PATCH /products/:product_id/presentations/:id`, `DELETE /products/:product_id/presentations/:id` — Admin presentation management
  - `POST /products/:product_id/provider_listings`, `PATCH /products/:product_id/provider_listings/:id` — Admin listing management
  - `POST /products/:product_id/provider_listings/:id/legacy/:record_type/:record_id` — Associate orphaned records with listings

### Scraper & Verifier
- **Scraper processing**: Batch processing now handles listings individually per presentation
- **Database writes**: Scraper must include `product_presentation_id` in all database operations
- **Legacy CLI lookup**: CLI now requires provider ID when an SKN exists at multiple providers
- **Scraper deployment**: Must be deployed **together with the API** — old scraper does not write required presentation IDs

### Environment Changes
- **Removed**: `SCRAPER_LOG_FILE` environment variable (scraper logs to stdout via Docker driver)
- **Updated**: PostgreSQL connection documentation in `example.env`

### Docker Deployment
- **All services** now specify `platform: linux/amd64` explicitly for consistent architecture
- **Logging configuration**: JSON-file driver with size limits (10m, max 3 files) on API, Frontend, Scraper, and Verifier
- **Health checks**: API now includes health check endpoint (`GET /up`) with 180s start grace period
- **Dependencies**: Scraper depends on API health check
- **Verifier startup**: Now uses `start-verifier.sh` for proper screenshot directory ownership and permissions
- **Screenshot directory**: Owned by UID 1000 (API container user) for cleanup operations

## New Features

### Product Model Enhancements
- **Brands & Categories**: Administrators can manage product brands and categories in the admin interface
- **Product Presentations**: Support multiple variants of the same product with different quantities and measurements
- **Provider Listings Management**: Admin interface for managing which presentations each provider lists
- **Catalog Management**: New admin page for managing brands, categories, and units of measure
- **Product Enrichment**: Admin interface to edit product presentations and manage provider listings

### Logging Improvements
- **Centralized Logging**: Frontend, API, Scraper, and Verifier all log to stdout via Docker JSON-file driver
- **Structured Logging**: Pino-based logging for the scraper with consistent format across services

### Frontend
- **Admin Catalog Management**: New components to manage brands, categories, and units of measure
- **Product Enrichment**: Enhanced product detail page with presentation and listing management
- **i18n Support**: English and Spanish translations for new admin and product features

## Database Migrations

### Migration Files
1. **20261109000000_add_product_presentations.rb** (103 lines)
   - Creates `brands`, `categories`, `units`, `unit_measures` tables
   - Creates `product_presentations` table with constraints
   - Adds foreign keys from products to brand/category
   - Migrates existing products to presentations
   - Transforms `providers_products` schema
   - Migrates `price_histories` and `scraper_incidents` associations

2. **20261110000000_preserve_presentation_history.rb** (21 lines)
   - Adds identity index on `providers_products`
   - Restructures foreign keys for presentation preservation
   - Ensures incidents track both listing and presentation identity

### Migration Strategy
- Creates default unknown-quantity presentation for each existing product
- Assigns existing provider listings to the default presentation
- Matches prices and incidents by product and provider
- Orphaned records (with no matching listing) retain their product and provider but no listing ID
- Orphaned records can be associated with the correct listing via new admin API

## Deployment Instructions

### Prerequisites
- PostgreSQL 16+ with at least 2GB free space
- Docker & Docker Compose 2.20+
- 4GB RAM available (API + Scraper + Verifier containers)
- Git repository with both API and Scraper branches up-to-date

### Step 1: Prepare and Backup
```bash
# 1. Backup current database
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE > scoopy_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup integrity
pg_restore -h $PGHOST -U $PGUSER --list scoopy_backup_*.sql | head -20

# 3. Document current state (for rollback reference)
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT version();"
```

### Step 2: Pull Latest Code
```bash
cd /path/to/Scoopy

# Ensure dev branch is up-to-date
git checkout dev
git pull origin dev

# Verify the feature/product-presentations and feature/handle-logs are merged
git log --oneline -5
# Should show: Merge pull request #113 (product-presentations) and #112 (logging)
```

### Step 3: Update Environment Configuration
```bash
# 1. Update .env file if needed
cp example.env .env
# Edit .env and verify:
# - PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# - Remove SCRAPER_LOG_FILE if present (deprecated)
# - Optional: SCRAPER_BATCH_DELAY_MS, PLAYWRIGHTHEADLESS

# 2. Example for local development with PostgreSQL in container:
# PGHOST=postgres  # or host.docker.internal on Mac/Windows
# PGPORT=5432
# PGUSER=postgres
# PGPASSWORD=password
# PGDATABASE=scoopy_dev

cat .env
```

### Step 4: Build and Run Migrations
```bash
# 1. Pull latest images
docker-compose pull

# 2. Build from source
docker-compose build --no-cache api scraper verifier frontend

# 3. Run database migrations
docker-compose run --rm api bin/rails db:migrate

# 4. Verify migration success
docker-compose run --rm api bin/rails db:version
# Output: Current version: 20261110000000

# 5. Check for orphaned records (records with no matching listing)
docker-compose run --rm api bin/rails runner \
  "puts \"Orphaned price_histories: #{PriceHistory.where(providers_product_id: nil).count}\"; \
   puts \"Orphaned scraper_incidents: #{ScraperIncident.where(providers_product_id: nil).count}\""
```

### Step 5: Start Services
```bash
# 1. Start all containers in background
docker-compose up -d

# 2. Wait for API to be healthy (180s grace period + retries)
docker-compose logs -f api
# Look for: "listening on 0.0.0.0:3000" or curl http://localhost:3000/up

# 3. Verify scraper connection to API
docker-compose logs -f scraper
# Look for: successful API connection, batch processing setup

# 4. Check frontend startup
docker-compose logs frontend
# Look for: "nginx started"

# 5. Verify verifier is running
docker-compose logs verifier
# Look for: "listening on 0.0.0.0:4000", Xvfb process
```

### Step 6: Handle Orphaned Records (if any)
```bash
# 1. Access Rails console
docker-compose run --rm api bin/rails console

# 2. Find orphaned records
PriceHistory.where(providers_product_id: nil).pluck(:product_id, :provider_id).uniq

# 3. For each orphaned record, find the correct listing:
# - Find provider_listing with same product and provider:
#   ProvidersProduct.where(product_id: product_id, provider_id: provider_id)
# 
# 4. Use admin API to associate orphaned record with listing:
# POST /products/:product_id/provider_listings/:listing_id/legacy/prices/:price_id
# POST /products/:product_id/provider_listings/:listing_id/legacy/incidents/:incident_id
```

### Step 7: Verify Functionality
```bash
# 1. Test product listing
curl http://localhost:3000/products -H "Authorization: Bearer $JWT_TOKEN"

# 2. Test catalog endpoints (admin only)
curl http://localhost:3000/brands -H "Authorization: Bearer $ADMIN_JWT_TOKEN"
curl http://localhost:3000/categories -H "Authorization: Bearer $ADMIN_JWT_TOKEN"
curl http://localhost:3000/unit_measures -H "Authorization: Bearer $ADMIN_JWT_TOKEN"

# 3. Create a test product with presentation
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -d '{"product":{"name":"Test Product"}}'

# 4. Check scraper is processing presentations
docker-compose logs scraper | grep -i "presentation"

# 5. Verify database constraints are in place
docker-compose run --rm api bin/rails runner \
  "puts \"Total products: #{Product.count}\"; \
   puts \"Total presentations: #{ProductPresentation.count}\"; \
   puts \"Total provider listings: #{ProvidersProduct.count}\""
```

### Step 8: Monitor for Issues
```bash
# 1. Check for migration errors
docker-compose logs api | grep -i "error\|migration\|fail"

# 2. Monitor scraper errors
docker-compose logs scraper | grep -i "error\|incident"

# 3. Check verifier health
curl http://localhost:4000/health 2>/dev/null || echo "Verifier not responding"

# 4. View container resource usage
docker stats scoopy-api scoopy-scraper scoopy-verifier scoopy-frontend

# 5. Check for database lock warnings
docker-compose run --rm api bin/rails runner \
  "exec_results = ActiveRecord::Base.connection.execute('SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;'); \
   puts exec_results"
```

## Rollback Instructions

⚠️ **IMPORTANT**: The migrations are **irreversible**. Rollback requires:

1. **Stop all containers**:
   ```bash
   docker-compose down
   ```

2. **Restore backup**:
   ```bash
   dropdb -h $PGHOST -U $PGUSER $PGDATABASE
   pg_restore -h $PGHOST -U $PGUSER -d $PGDATABASE < scoopy_backup_*.sql
   ```

3. **Checkout previous version**:
   ```bash
   git checkout v0.2.7-rc.1  # or your previous stable tag
   ```

4. **Restart services**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Testing Checklist

- [ ] Database migrations complete without errors
- [ ] API starts successfully and passes health checks
- [ ] Scraper connects to API and begins processing
- [ ] Admin catalog management page loads
- [ ] Product enrichment interface displays presentations and listings
- [ ] Existing products display in product list
- [ ] Price history loads for existing products
- [ ] Scraper incidents appear for products under verification
- [ ] Screenshot verification works through verifier service
- [ ] Logs appear in Docker JSON-file logging driver
- [ ] CPU and memory usage are within expected ranges

## Known Issues & Limitations

- **Irreversible migrations**: Backup is mandatory before deployment
- **Concurrent listing updates**: Concurrent PATCH requests to listings may cause race conditions (serialization is recommended)
- **Legacy record association**: Must be done manually via admin API for orphaned records
- **Scraper compatibility**: Old scraper (v0.2.x) will write invalid data if deployed with this API version

## Support & Migration Questions

For issues during migration:
1. Check Docker logs: `docker-compose logs [service]`
2. Review database state: `docker-compose run --rm api bin/rails console`
3. Contact development team with backup, logs, and current state

## Changes Summary

**48 files changed, 1,881 insertions(+), 132 deletions(-)**

Key changed areas:
- Backend: 16 new/modified files (models, controllers, migrations, services)
- Frontend: 8 new/modified files (components, pages, i18n)
- Scraper: 7 new/modified files (processing logic, database functions, tests)
- Configuration: 6 changed files (Docker Compose, environment)
- Documentation: 2 new/updated files

---

**Release Manager**: Copilot  
**Issue Reference**: #104 (Product Model Improvement and Migration)  
**Previous Version**: v0.2.7-rc.1  
**Status**: ✅ Ready for RC testing on staging environment
