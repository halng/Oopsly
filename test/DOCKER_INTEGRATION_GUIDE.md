# Docker Integration for Integration Testing

This guide explains how to run integration tests against a real API server using Docker.

## Overview

The test framework now supports **automatic Docker management** for integration testing. When you run integration tests, Docker services (API + PostgreSQL + Redis) are automatically started, and tests run against the real server.

## Quick Start

### Automatic Mode (Recommended)

```bash
# Just run integration tests - Docker auto-manages everything!
cd test
./run_tests.sh integration

# Or directly with pytest
pytest tests/integration/ -v
```

**What happens:**
1. Docker Compose starts: PostgreSQL, Redis, and API server
2. Pytest waits for services to be healthy
3. Tests run against the real API at `http://localhost:9009`
4. Docker services automatically stop after tests complete

### Manual Mode

If you want to manage Docker separately:

```bash
# Start services manually
./setup_test_environment.sh up

# Run tests (Docker won't auto-start/stop)
USE_DOCKER=false pytest tests/integration/ -v

# Stop services when done
./setup_test_environment.sh down
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Integration Tests                     │
│                      (pytest)                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTP Requests
                  │
┌─────────────────▼───────────────────────────────────────┐
│              API Server (Docker)                         │
│            Port: 9009                                    │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │   PostgreSQL     │  │      Redis       │            │
│  │   Port: 5433     │  │    Port: 6380    │            │
│  └──────────────────┘  └──────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

## Docker Compose Configuration

### Services

**`docker-compose.test.yml`** defines three services:

1. **postgres** - PostgreSQL 15.4 database
   - Port: 5433 (to avoid conflicts with local PostgreSQL)
   - Database: `oopsly_test`
   - Health check: `pg_isready`

2. **redis** - Redis cache
   - Port: 6380 (to avoid conflicts with local Redis)
   - Health check: `redis-cli ping`

3. **api** - API server (built from local Dockerfile)
   - Port: 9009
   - Health check: `/actuator/health` endpoint
   - Depends on: postgres, redis (waits for health)
   - Auto-configured to connect to test database

### Environment Variables

The Docker setup uses test-specific configuration:

```yaml
DB_HOST: postgres
DB_PORT: 5432
DB_NAME: oopsly_test
DB_USERNAME: postgres
DB_PASSWORD: testpassword

REDIS_HOST: redis
REDIS_PORT: 6379

JWT_SECRET: test_jwt_secret_min_256_bits...
SPRING_PROFILES_ACTIVE: test
```

## Test Setup Script

### `setup_test_environment.sh`

Convenience script for manual Docker management:

```bash
# Start all services
./setup_test_environment.sh up
# Output:
# [INFO] Starting integration test environment...
# [INFO] Building API server image...
# [INFO] Starting services...
# [INFO] Waiting for services to be healthy...
# [SUCCESS] All services are running and healthy!
# API Server: http://localhost:9009

# Check status
./setup_test_environment.sh status

# View logs
./setup_test_environment.sh logs

# Restart services
./setup_test_environment.sh restart

# Stop services
./setup_test_environment.sh down

# Clean up volumes
./setup_test_environment.sh clean
```

## Pytest Integration

### Automatic Docker Management

The `conftest.py` includes a session-scoped fixture that:

1. **Starts Docker** services before any tests run
2. **Waits for health** checks to pass
3. **Runs tests** against the real API
4. **Stops Docker** services after all tests complete

```python
@pytest.fixture(scope="session", autouse=True)
def docker_services():
    """
    Automatically start Docker services if USE_DOCKER=true.
    Runs once per test session.
    """
    # Start Docker Compose
    # Wait for API health check
    # Yield (tests run here)
    # Stop Docker Compose
```

### Health Checks

Before tests run, the framework verifies:

- ✅ PostgreSQL is accepting connections
- ✅ Redis is responding to ping
- ✅ API server returns 200 from `/actuator/health`

If health checks fail, pytest shows the last 50 lines of Docker logs and fails the test session.

## Environment Variables

Control Docker integration with environment variables:

### `USE_DOCKER`
- **Default:** `true`
- **Description:** Auto-start/stop Docker for integration tests
- **Usage:**
  ```bash
  # With Docker (default)
  pytest tests/integration/ -v
  
  # Without Docker (manual server)
  USE_DOCKER=false pytest tests/integration/ -v
  ```

### `DOCKER_STARTUP_TIMEOUT`
- **Default:** `120` (seconds)
- **Description:** Maximum time to wait for services to become healthy
- **Usage:**
  ```bash
  DOCKER_STARTUP_TIMEOUT=180 pytest tests/integration/ -v
  ```

### `API_BASE_URL`
- **Default:** `http://localhost:9009` (when USE_DOCKER=true)
- **Description:** Override the API server URL
- **Usage:**
  ```bash
  API_BASE_URL=http://staging.example.com pytest tests/integration/ -v
  ```

## Common Workflows

### 1. Development (Fast Iteration)

```bash
# Start Docker once
./setup_test_environment.sh up

# Run tests multiple times (fast, no Docker startup)
USE_DOCKER=false pytest tests/integration/api/test_deck_api.py -v
USE_DOCKER=false pytest tests/integration/api/test_card_api.py -v

# Stop Docker when done
./setup_test_environment.sh down
```

### 2. CI/CD Pipeline

```bash
# Full automated test (Docker auto-managed)
./run_tests.sh integration

# Or with pytest directly
pytest tests/integration/ -v --junitxml=test-results.xml
```

### 3. Debugging Failures

```bash
# Start services
./setup_test_environment.sh up

# Check service status
./setup_test_environment.sh status

# View logs
./setup_test_environment.sh logs

# Test specific endpoint
curl http://localhost:9009/actuator/health

# Run tests without Docker auto-management
USE_DOCKER=false pytest tests/integration/ -v -s
```

### 4. Performance Testing

```bash
# Start Docker
./setup_test_environment.sh up

# Run performance tests against Docker instance
./run_tests.sh performance smoke

# Stop Docker
./setup_test_environment.sh down
```

## Troubleshooting

### Issue: "Docker daemon is not running"

**Solution:** Start Docker Desktop or Docker daemon:
```bash
# macOS/Windows: Start Docker Desktop
# Linux:
sudo systemctl start docker
```

### Issue: "Port already in use"

**Solution:** Change ports in `docker-compose.test.yml`:
```yaml
ports:
  - "9010:9009"  # Use different port
```

Or stop conflicting services:
```bash
# Find process using port
lsof -i :9009

# Stop local API if running
pkill -f osmosis-backend
```

### Issue: "Services not becoming healthy"

**Solution:** Check logs for errors:
```bash
./setup_test_environment.sh logs

# Or specifically:
docker-compose -f docker-compose.test.yml logs api
```

Common causes:
- Database connection issues
- Missing environment variables
- API build failures

### Issue: "Build takes too long"

**Solution:** Use cached images:
```bash
# Pre-build the image
cd ../api
docker build -t oopsly-api:test .

# Then reference in docker-compose.test.yml:
# image: oopsly-api:test
# (instead of build: ...)
```

### Issue: "Tests fail but API works manually"

**Solution:** Check environment differences:
```bash
# Compare manual vs Docker environments
curl http://localhost:9009/actuator/env

# Check if test data exists
docker-compose -f docker-compose.test.yml exec postgres \
  psql -U postgres -d oopsly_test -c "SELECT * FROM decks;"
```

## Advanced Configuration

### Custom Docker Compose File

Create your own compose file:

```bash
cp docker-compose.test.yml docker-compose.custom.yml
# Edit docker-compose.custom.yml

# Use it:
docker-compose -f docker-compose.custom.yml up
```

### Network Debugging

Access services from your host:

```bash
# API
curl http://localhost:9009/actuator/health

# PostgreSQL
psql -h localhost -p 5433 -U postgres -d oopsly_test

# Redis
redis-cli -p 6380 ping
```

### Volume Management

```bash
# List volumes
docker volume ls | grep test

# Remove volumes (cleans database)
./setup_test_environment.sh clean

# Or manually:
docker-compose -f docker-compose.test.yml down -v
```

## Best Practices

### ✅ Do

- Let Docker auto-manage in CI/CD
- Use manual mode for local development (faster iterations)
- Check health endpoints before running tests
- Clean up volumes between test runs if needed
- Use different ports to avoid conflicts

### ❌ Don't

- Don't commit `.env` files with secrets
- Don't mix test and production databases
- Don't run performance tests with limited Docker resources
- Don't forget to stop Docker services after testing

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          cd test
          pip install -r config/requirement.txt
      
      - name: Run integration tests
        run: |
          cd test
          pytest tests/integration/ -v --junitxml=test-results.xml
        env:
          USE_DOCKER: true
      
      - name: Publish test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test/test-results.xml
```

### GitLab CI Example

```yaml
integration_tests:
  image: python:3.10
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    USE_DOCKER: "true"
  script:
    - cd test
    - pip install -r config/requirement.txt
    - pytest tests/integration/ -v --junitxml=test-results.xml
  artifacts:
    reports:
      junit: test/test-results.xml
```

## Performance Considerations

### Docker Resources

Allocate sufficient resources in Docker settings:

- **CPU:** Minimum 2 cores
- **Memory:** Minimum 4GB
- **Disk:** Minimum 20GB

### Startup Time

Typical startup times:

- **First build:** 3-5 minutes (compiles native image)
- **Cached build:** 30-60 seconds
- **Services startup:** 20-40 seconds
- **Total (first time):** ~5 minutes
- **Total (cached):** ~90 seconds

### Optimization Tips

1. **Pre-build images:**
   ```bash
   docker-compose -f docker-compose.test.yml build
   ```

2. **Use Docker layer caching in CI:**
   ```yaml
   - name: Cache Docker layers
     uses: actions/cache@v3
     with:
       path: /tmp/.buildx-cache
       key: ${{ runner.os }}-buildx-${{ github.sha }}
   ```

3. **Keep containers running during development:**
   ```bash
   ./setup_test_environment.sh up
   USE_DOCKER=false pytest tests/integration/ -v
   ```

## Summary

The Docker integration provides:

- ✅ **Automatic setup:** No manual server startup needed
- ✅ **Isolated environment:** Tests don't affect local development
- ✅ **Consistent results:** Same environment locally and in CI
- ✅ **Health checks:** Ensures services are ready before testing
- ✅ **Easy debugging:** View logs, check status, inspect services
- ✅ **Flexible:** Auto or manual mode, configurable via environment variables

**Next Steps:**
1. Run `./run_tests.sh integration` to try it out
2. Check `./setup_test_environment.sh status` to verify services
3. View logs with `./setup_test_environment.sh logs` if needed
4. Integrate into your CI/CD pipeline using the examples above
