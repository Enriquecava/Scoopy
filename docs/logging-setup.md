# Logging Setup Guide

## Overview

This document describes the centralized logging setup for the Scoopy application across all services (frontend, scraper, API, and verifier).

## Architecture

All services are configured to output logs to stdout/stderr, which are captured by Docker and can be forwarded to Grafana/Loki or other centralized logging systems.

### Services and Their Logging

#### 1. **Scraper (Node.js + Pino)**

- **Logger**: Pino (structured logging)
- **Output**: stdout only
- **Log Format**: JSON
- **Environment Variables**: None (SCRAPER_LOG_FILE is no longer needed)

**Key improvements:**
- Removed file-based logging (was redundant in Docker)
- All logs now go to stdout for collection by Docker
- Structured JSON logging enables filtering and parsing in Grafana/Loki

#### 2. **Verifier (Node.js + Pino)**

- **Logger**: Pino (same as scraper)
- **Output**: stdout only
- **Log Format**: JSON

**Features:**
- Independent logging from scraper
- Identifies itself as service: `scoopy-scraper` (same as scraper for grouping)

#### 3. **API (Rails)**

- **Logger**: Rails built-in logger
- **Output**: stdout (via Rails logging config)
- **Log Format**: JSON or standard Rails format
- **Status**: Already configured to output to stdout

#### 4. **Frontend (React + nginx)**

**nginx logs:**
- **Output**: stdout (via `/dev/stdout`)
- **Log Format**: Combined format
- **Includes**: Access logs and errors

**Application logs:**
- **Logger**: Custom logger module (`src/shared/logger.ts`)
- **Output**: Browser console (dev) + HTTP POST to backend
- **Error Handling**: Global error handler captures uncaught errors
- **Features**: Only sends warn/error logs to backend to avoid overhead

**Log Event Types:**
- `frontend.app.*`: Application lifecycle events
- `frontend.route.*`: Navigation events
- `frontend.api.*`: API call events
- `frontend.user.*`: User interaction events
- `frontend.data.*`: Data operations
- `frontend.component.*`: Component lifecycle events

## Configuration

### Docker Compose Logging Driver

All services use the `json-file` logging driver with the following options:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"      # Max log file size before rotation
    max-file: "3"        # Keep 3 rotated files
```

This ensures:
- Logs are stored locally for quick access
- Docker can still forward logs via drivers to Grafana/Loki
- Log files don't grow unbounded

### Environment Setup

The `.env` file no longer needs `SCRAPER_LOG_FILE`:

```bash
# REMOVE THIS:
# SCRAPER_LOG_FILE=./scraper/logs/scraper-info.log
```

This is no longer used and can be deleted from `.env`.

## Viewing Logs

### View logs in Docker

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f scraper
docker compose logs -f verifier
docker compose logs -f api
docker compose logs -f frontend

# Follow logs with timestamps
docker compose logs -f --timestamps

# Last N lines
docker compose logs --tail 100
```

### Filtering Logs

Since all logs are JSON or structured format, you can use `jq` to filter:

```bash
# Scraper errors only
docker compose logs scraper | jq 'select(.level >= 40)'

# Frontend API errors
docker compose logs frontend | jq 'select(.event == "frontend.api.error")'

# All error logs from all services
docker compose logs | jq 'select(.level >= 40) | {service, level, message}'
```

## Integration with Grafana/Loki

To forward logs to Grafana Loki or other centralized logging:

### Option 1: Using Grafana Alloy (Recommended)

Configure Grafana Alloy to collect Docker logs:

```yaml
# alloy-config.yaml
discovery.docker "default" {
  host = "unix:///var/run/docker.sock"
}

loki.process "docker" {
  stage.json {
    expressions = {
      level = "level",
      service = "service",
      message = "message",
      event = "event",
    }
  }

  forward_to = [loki.write.default.receiver]
}

discovery.relabel "logs" {
  targets = discovery.docker.default.containers
  
  rule {
    source_labels = ["__container_name"]
    target_label  = "job"
  }
  
  rule {
    source_labels = ["__container_name"]
    target_label  = "instance"
  }
}

loki.source.docker "logs" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.relabel.logs.output
  forward_to = [loki.process.docker.receiver]
}

loki.write "default" {
  clients = [{
    url = "http://localhost:3100/loki/api/v1/push"
  }]
}
```

### Option 2: Using Docker Logging Driver

Configure Docker daemon to forward logs directly:

```json
{
  "log-driver": "loki",
  "log-opts": {
    "loki-url": "http://localhost:3100/loki/api/v1/push"
  }
}
```

## Log Levels

All services use standard log levels:

- **error** (50): Application errors
- **warn** (40): Warnings
- **info** (30): Informational messages
- **debug** (20): Debug information

## Redacted Fields

The following fields are automatically redacted to prevent leaking credentials:

- `password`
- `token`
- `cookie`
- `authorization`
- `headers.authorization`
- `headers.cookie`

## Testing

To verify logging is working:

1. **Start services:**
   ```bash
   docker compose up
   ```

2. **Check stdout logs:**
   ```bash
   docker compose logs -f scraper
   docker compose logs -f frontend
   ```

3. **Trigger errors:**
   - Frontend: Open browser console (F12) and trigger an error
   - Scraper: Trigger a scraping job
   - API: Make a request that causes an error

4. **Verify logs appear:**
   ```bash
   docker compose logs --tail 50
   ```

## Troubleshooting

### Logs not appearing in docker logs

1. **Check if service is running:**
   ```bash
   docker ps
   ```

2. **Check service logs directly:**
   ```bash
   docker compose logs <service>
   ```

3. **Check Docker daemon is configured correctly:**
   ```bash
   docker info | grep -A5 "Logging Driver"
   ```

### Frontend logs not reaching backend

- Check browser console for errors
- Verify `VITE_API_URL` environment variable is set correctly
- Check API `/api/logs` endpoint exists and is accepting POST requests

### Log files taking too much space

- Check `max-size` and `max-file` settings in docker-compose.yml
- Prune old Docker logs: `docker system prune --volumes`

## Related Files

- Frontend logger: [`frontend/src/shared/logger.ts`](/frontend/src/shared/logger.ts)
- Frontend error handler: [`frontend/src/shared/useErrorHandler.ts`](/frontend/src/shared/useErrorHandler.ts)
- Scraper logger: [`scraper/utils/logger.ts`](/scraper/utils/logger.ts)
- Docker Compose: [`scoopy-api/docker-compose.yml`](/scoopy-api/docker-compose.yml), [`frontend/docker-compose.yml`](/frontend/docker-compose.yml)
- nginx config: [`frontend/nginx.conf`](/frontend/nginx.conf)
