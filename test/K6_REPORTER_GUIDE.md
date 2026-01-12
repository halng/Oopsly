# K6 Reporter Integration Guide

## Overview

This guide explains how to use the integrated k6-reporter for generating comprehensive performance test reports in multiple formats (HTML, JSON, and Markdown).

## Features

- **📊 HTML Reports**: Beautiful, interactive visual reports with charts and graphs
- **📄 Markdown Reports**: GitHub-friendly reports that render in source control
- **📋 JSON Reports**: Machine-readable format for CI/CD integration
- **📈 Console Output**: Colorized text summary during test execution
- **✅ Threshold Compliance**: Automatic pass/fail determination based on KPIs
- **💡 Recommendations**: Automated suggestions based on test results

## Quick Start

### Running Tests with Reports

```bash
# Run any k6 test - reports are generated automatically
k6 run tests/perf/k6/baseline_load_test.js

# Specify report directory (optional)
k6 run tests/perf/k6/baseline_load_test.js --env REPORT_DIR=../../../reports

# Run with custom environment
k6 run tests/perf/k6/baseline_load_test.js \
  --env API_BASE_URL=https://api.production.com \
  --env TEST_TYPE=baseline \
  --env TARGET_RPS=200
```

### Output Files

After running a test, you'll find these files in the `reports/` directory:

```
reports/
├── k6_baseline_report_2026-01-12T13-45-30.html    # Visual HTML report
├── k6_baseline_report_2026-01-12T13-45-30.json    # JSON data
└── k6_baseline_report_2026-01-12T13-45-30.md      # Markdown report
```

## Report Formats

### 1. HTML Report (Primary Visual Format)

**Features:**
- Interactive charts and graphs
- Color-coded metrics (green/yellow/red)
- Custom styled with gradient headers
- Detailed breakdown by endpoint
- Timeline visualizations

**Use cases:**
- Stakeholder presentations
- Detailed analysis in browsers
- Visual performance review

**Example:**
```bash
# Open HTML report in browser
open reports/k6_baseline_report_*.html
```

### 2. Markdown Report (GitHub/GitLab)

**Features:**
- Renders beautifully in GitHub/GitLab
- Tables with status indicators (✅ ❌ ⚠️ 🟢 🔴)
- Easy to diff between releases
- Includes recommendations
- Version control friendly

**Sections:**
- Executive Summary
- Performance Metrics (latency percentiles)
- Throughput Statistics
- Threshold Compliance
- Detailed Metrics
- Recommendations
- Test Configuration

**Use cases:**
- Pull request reviews
- Release documentation
- Version-controlled test history

### 3. JSON Report (CI/CD Integration)

**Features:**
- Complete test data in JSON format
- Machine-readable
- Programmatic analysis
- CI/CD pipeline integration

**Use cases:**
- Automated quality gates
- Performance regression detection
- Historical trend analysis

**Example:**
```bash
# Parse JSON report
jq '.metrics.http_req_duration.values.["p(95)"]' reports/k6_baseline_report_*.json
```

### 4. Console Output

**Features:**
- Real-time colored output
- Summary statistics
- Threshold pass/fail status

**Use cases:**
- Quick feedback during test run
- CI/CD logs
- Terminal monitoring

## Report Content

### Executive Summary

| Metric | What It Shows |
|--------|---------------|
| **Total Requests** | Number of HTTP requests made |
| **Failed Requests** | Number of failed requests |
| **Error Rate** | Percentage of failed requests |
| **Peak VUs** | Maximum concurrent virtual users |
| **Test Duration** | Total test execution time |
| **Overall Status** | 🟢 PASSED or 🔴 FAILED |

### Performance Metrics

#### Latency Percentiles

| Percentile | Meaning | Target |
|------------|---------|--------|
| **Average** | Mean response time | < 200ms |
| **P50 (Median)** | 50% of requests faster than this | < 100ms |
| **P90** | 90% of requests faster than this | < 300ms |
| **P95** | 95% of requests faster than this | **< 500ms** ⚠️ |
| **P99** | 99% of requests faster than this | **< 1000ms** ⚠️ |
| **Max** | Slowest request | - |

**Status Indicators:**
- ✅ **Pass**: Meets target
- ⚠️ **Warning**: Close to threshold
- ❌ **Fail**: Exceeds threshold

### Threshold Compliance

Automatically checks against defined KPIs:

```javascript
{
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'errors': ['rate<0.01'],
  'http_req_failed': ['rate<0.01']
}
```

### Automated Recommendations

Based on test results, the report provides actionable recommendations:

**If P95 latency exceeds target:**
- Consider optimizing database queries
- Review slow endpoints and add caching
- Check for N+1 query problems

**If P99 latency exceeds target:**
- Investigate outliers and edge cases
- Consider implementing request timeouts
- Review connection pool sizing

**If error rate exceeds threshold:**
- Check application logs for errors
- Verify database connection stability
- Review API error handling

**If all thresholds passed:**
- Consider stress testing with higher load
- Monitor these metrics in production
- Maintain current optimization practices

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REPORT_DIR` | `../../../reports` | Directory for report files |
| `TEST_TYPE` | `baseline` | Test type (baseline, stress, spike, soak) |
| `API_BASE_URL` | `http://localhost:9009` | API server URL |
| `TARGET_RPS` | `100` | Target requests per second |
| `ENVIRONMENT` | `local` | Environment name (local, staging, prod) |

### Custom Report Directory

```bash
# Save reports to custom location
k6 run tests/perf/k6/baseline_load_test.js \
  --env REPORT_DIR=/custom/path/reports
```

### Report Naming Convention

Reports are automatically named with:
- Test type prefix: `k6_{testType}_report_`
- Timestamp: `YYYY-MM-DDTHH-MM-SS`
- Format extension: `.html`, `.json`, `.md`

Example: `k6_baseline_report_2026-01-12T13-45-30.html`

## Test Types

### 1. Baseline Load Test

**Purpose:** Verify system handles expected daily traffic

**Duration:** 30 minutes

**Example:**
```bash
k6 run tests/perf/k6/baseline_load_test.js
```

**Report shows:**
- P95/P99 latency under normal load
- Sustained throughput capability
- Error rate baseline

### 2. Stress Test

**Purpose:** Find system breaking point

**Duration:** 32 minutes

**Example:**
```bash
k6 run tests/perf/k6/stress_test.js --env TEST_TYPE=stress
```

**Report shows:**
- Latency degradation under increasing load
- Point where errors start occurring
- Recovery behavior

### 3. Spike Test

**Purpose:** Test resilience to sudden traffic surges

**Duration:** 7 minutes

**Example:**
```bash
k6 run tests/perf/k6/spike_test.js --env TEST_TYPE=spike
```

**Report shows:**
- Cold start performance
- Spike handling capability
- Auto-scaling effectiveness

### 4. Soak Test

**Purpose:** Detect memory leaks and degradation over time

**Duration:** 4 hours

**Example:**
```bash
k6 run tests/perf/k6/soak_test.js --env TEST_TYPE=soak
```

**Report shows:**
- Performance stability over time
- Memory leak indicators
- Sustained load handling

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start test environment
        run: |
          cd test
          ./setup_test_environment.sh up
      
      - name: Run baseline test
        run: |
          cd test
          k6 run tests/perf/k6/baseline_load_test.js \
            --env API_BASE_URL=http://localhost:9009/api/v1/oopsly \
            --env ENVIRONMENT=ci
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: test/reports/k6_*.{html,json,md}
      
      - name: Check thresholds
        run: |
          # Extract pass/fail from JSON report
          PASSED=$(jq -r '.root_group.checks | map(select(.passes > 0)) | length > 0' \
            test/reports/k6_baseline_report_*.json)
          if [ "$PASSED" != "true" ]; then
            echo "Performance thresholds failed!"
            exit 1
          fi
      
      - name: Stop test environment
        if: always()
        run: |
          cd test
          ./setup_test_environment.sh down
```

### GitLab CI Example

```yaml
performance-test:
  stage: test
  image: grafana/k6:latest
  services:
    - docker:dind
  script:
    - cd test
    - ./setup_test_environment.sh up
    - k6 run tests/perf/k6/baseline_load_test.js
      --env API_BASE_URL=$API_URL
      --env ENVIRONMENT=ci
  artifacts:
    paths:
      - test/reports/k6_*
    reports:
      junit: test/reports/k6_*.json
  after_script:
    - cd test
    - ./setup_test_environment.sh down
  only:
    - schedules
    - main
```

## Advanced Usage

### Custom Metrics

Add custom metrics to your tests and they'll appear in reports:

```javascript
import { Trend } from 'k6/metrics';

const customMetric = new Trend('custom_operation_duration');

export default function() {
    const start = Date.now();
    // ... your operation ...
    customMetric.add(Date.now() - start);
}
```

### Filtering Results

Use k6's built-in tags to filter report data:

```javascript
const params = {
    tags: { 
        endpoint: 'GET /decks',
        region: 'us-east-1'
    }
};

http.get(url, params);
```

### Multiple Report Directories

Generate reports to different locations:

```bash
# Production reports
k6 run test.js --env REPORT_DIR=reports/production

# Staging reports
k6 run test.js --env REPORT_DIR=reports/staging
```

## Troubleshooting

### Reports Not Generated

**Problem:** No report files created after test

**Solutions:**
1. Check report directory exists: `mkdir -p reports`
2. Verify write permissions: `chmod +w reports/`
3. Check for errors in console output
4. Ensure `handleSummary()` function is exported

### HTML Report Not Rendering

**Problem:** HTML report doesn't display properly

**Solutions:**
1. Use modern browser (Chrome, Firefox, Safari, Edge)
2. Check browser console for JavaScript errors
3. Ensure k6-reporter library loaded correctly
4. Try opening from local file system

### JSON Parsing Errors

**Problem:** Cannot parse JSON report

**Solutions:**
1. Validate JSON: `jq . reports/k6_*.json`
2. Check file is complete (test finished)
3. Ensure sufficient disk space
4. Review test logs for errors

### Threshold Mismatches

**Problem:** Thresholds pass in test but fail in report

**Solutions:**
1. Check threshold definitions match in test and analysis
2. Verify metric names are consistent
3. Review actual values in JSON report
4. Consider network/environment differences

## Best Practices

### 1. Regular Testing

Run performance tests regularly:
- **Daily:** Baseline tests
- **Weekly:** Stress and spike tests
- **Monthly:** Soak tests (4+ hours)
- **Pre-release:** Full test suite

### 2. Baseline Comparison

Save reports for baseline comparison:

```bash
# Tag reports with version
k6 run test.js --env REPORT_DIR=reports/v1.2.0

# Compare with previous version
diff reports/v1.2.0/k6_baseline_report_*.md \
     reports/v1.1.0/k6_baseline_report_*.md
```

### 3. Trend Analysis

Track metrics over time:

```bash
# Extract P95 from all reports
for file in reports/k6_baseline_report_*.json; do
  echo "$file: $(jq -r '.metrics.http_req_duration.values["p(95)"]' $file)ms"
done
```

### 4. Alert Thresholds

Set up alerts based on report data:

```bash
# Check if P95 exceeds 500ms
P95=$(jq -r '.metrics.http_req_duration.values["p(95)"]' report.json)
if (( $(echo "$P95 > 500" | bc -l) )); then
  echo "ALERT: P95 latency exceeded 500ms: ${P95}ms"
  # Send notification...
fi
```

### 5. Report Retention

Implement report retention policy:

```bash
# Keep only last 30 days of reports
find reports/ -name "k6_*_report_*" -mtime +30 -delete

# Archive old reports
tar -czf reports/archive/$(date +%Y-%m).tar.gz reports/k6_*
```

## Report Examples

### Successful Test

```
# Test Report - BASELINE

Generated: 2026-01-12T14:30:00Z
Test Type: baseline
Duration: 1800.00s
Status: 🟢 PASSED

## Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Requests | 180,000 | - | ℹ️ |
| Failed Requests | 45 | < 1% | ✅ |
| Error Rate | 0.03% | < 1% | ✅ |
| Peak VUs | 100 | - | ℹ️ |

### Overall Status: 🟢 PASSED

## Performance Metrics

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| P95 | 485.23ms | < 500ms | ✅ |
| P99 | 892.45ms | < 1000ms | ✅ |
| Error Rate | 0.03% | < 1% | ✅ |

## Recommendations

✅ All thresholds passed! System performing well.
   - Consider stress testing with higher load
   - Monitor these metrics in production
   - Maintain current optimization practices
```

### Failed Test

```
# Test Report - STRESS

Generated: 2026-01-12T15:45:00Z
Test Type: stress
Duration: 1920.00s
Status: 🔴 FAILED

## Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Requests | 95,000 | - | ℹ️ |
| Failed Requests | 2,850 | < 1% | ❌ |
| Error Rate | 3.00% | < 1% | ❌ |
| Peak VUs | 800 | - | ℹ️ |

### Overall Status: 🔴 FAILED

## Performance Metrics

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| P95 | 1,245.67ms | < 500ms | ❌ |
| P99 | 3,892.12ms | < 1000ms | ❌ |
| Error Rate | 3.00% | < 1% | ❌ |

## Recommendations

⚠️ P95 latency (1245.67ms) exceeds target (500ms)
   - Consider optimizing database queries
   - Review slow endpoints and add caching
   - Check for N+1 query problems

🔴 Error rate (3.00%) exceeds threshold (1%)
   - Check application logs for errors
   - Verify database connection stability
   - Review API error handling
```

## Additional Resources

- **k6 Documentation**: https://k6.io/docs/
- **k6-reporter**: https://github.com/benc-uk/k6-reporter
- **Performance Testing Guide**: `/test/TESTING_STRATEGY.md`
- **Docker Integration**: `/test/DOCKER_INTEGRATION_GUIDE.md`
- **Runtime Testing**: `/test/RUNTIME_TESTING_GUIDE.md`

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review k6 documentation
3. Check test logs for error details
4. Verify environment configuration
