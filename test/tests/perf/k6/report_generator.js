/*
 * Copyright (c) 2025 Hal Ng
 * All Rights Reserved.
 *
 * K6 Report Generator - Using htmlReport from k6-reporter
 * Generates beautiful HTML reports from k6 test results
 */

import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 * Generate comprehensive test report in multiple formats
 * @param {Object} data - k6 test summary data
 * @returns {Object} - Report files to generate
 */
export function generateReport(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const testType = __ENV.TEST_TYPE || 'baseline';
    const reportDir = __ENV.REPORT_DIR || '../../../reports';
    
    return {
        // HTML report (primary - beautiful visual report)
        [`${reportDir}/k6_${testType}_report_${timestamp}.html`]: htmlReport(data, {
            title: `K6 ${testType.charAt(0).toUpperCase() + testType.slice(1)} Load Test Report`,
            customStyles: `
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .metric-good { color: #10b981; }
                .metric-warning { color: #f59e0b; }
                .metric-bad { color: #ef4444; }
            `
        }),
        
        // JSON report (for CI/CD integration)
        [`${reportDir}/k6_${testType}_report_${timestamp}.json`]: JSON.stringify(data, null, 2),
        
        // Text summary (for console output)
        stdout: textSummary(data, { indent: " ", enableColors: true }),
        
        // Markdown report (for GitHub/GitLab)
        [`${reportDir}/k6_${testType}_report_${timestamp}.md`]: generateMarkdownReport(data, testType)
    };
}

/**
 * Generate Markdown report from k6 data
 * @param {Object} data - k6 test summary data
 * @param {String} testType - Type of test (baseline, stress, spike, soak)
 * @returns {String} - Markdown formatted report
 */
function generateMarkdownReport(data, testType) {
    const timestamp = new Date().toISOString();
    const metrics = data.metrics;
    
    // Calculate key statistics
    const totalRequests = metrics.http_reqs ? metrics.http_reqs.values.count : 0;
    const failedRequests = metrics.http_req_failed ? metrics.http_req_failed.values.passes : 0;
    const errorRate = totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) : 0;
    
    const p95Latency = metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'] : 0;
    const p99Latency = metrics.http_req_duration ? metrics.http_req_duration.values['p(99)'] : 0;
    const avgLatency = metrics.http_req_duration ? metrics.http_req_duration.values.avg : 0;
    
    const testDuration = data.state.testRunDurationMs / 1000;
    const vusMax = metrics.vus_max ? metrics.vus_max.values.max : 0;
    
    // Determine pass/fail status
    const p95Pass = p95Latency < 500;
    const p99Pass = p99Latency < 1000;
    const errorRatePass = errorRate < 1;
    
    const overallPass = p95Pass && p99Pass && errorRatePass;
    const statusIcon = overallPass ? '🟢' : '🔴';
    const statusText = overallPass ? 'PASSED' : 'FAILED';
    
    return `# K6 Performance Test Report - ${testType.toUpperCase()}

**Generated:** ${timestamp}  
**Test Type:** ${testType}  
**Duration:** ${testDuration.toFixed(2)}s  
**Status:** ${statusIcon} **${statusText}**

---

## 📊 Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Requests** | ${totalRequests.toLocaleString()} | - | ℹ️ |
| **Failed Requests** | ${failedRequests} | < 1% | ${errorRatePass ? '✅' : '❌'} |
| **Error Rate** | ${errorRate}% | < 1% | ${errorRatePass ? '✅' : '❌'} |
| **Peak VUs** | ${vusMax} | - | ℹ️ |
| **Test Duration** | ${testDuration.toFixed(2)}s | - | ℹ️ |

### Overall Status: ${statusIcon} ${statusText}

---

## ⚡ Performance Metrics

### Latency (HTTP Request Duration)

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| **Average** | ${avgLatency.toFixed(2)}ms | < 200ms | ${avgLatency < 200 ? '✅' : avgLatency < 500 ? '⚠️' : '❌'} |
| **P50 (Median)** | ${(metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms | < 100ms | ${(metrics.http_req_duration?.values?.med || 0) < 100 ? '✅' : '⚠️'} |
| **P90** | ${(metrics.http_req_duration?.values['p(90)'] || 0).toFixed(2)}ms | < 300ms | ${(metrics.http_req_duration?.values['p(90)'] || 0) < 300 ? '✅' : '⚠️'} |
| **P95** | ${p95Latency.toFixed(2)}ms | **< 500ms** | ${p95Pass ? '✅' : '❌'} |
| **P99** | ${p99Latency.toFixed(2)}ms | **< 1000ms** | ${p99Pass ? '✅' : '❌'} |
| **Max** | ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms | - | ℹ️ |

### Throughput

| Metric | Value |
|--------|-------|
| **Requests/Second** | ${(totalRequests / testDuration).toFixed(2)} RPS |
| **Data Received** | ${((metrics.data_received?.values?.count || 0) / 1024 / 1024).toFixed(2)} MB |
| **Data Sent** | ${((metrics.data_sent?.values?.count || 0) / 1024 / 1024).toFixed(2)} MB |

---

## 🎯 Threshold Compliance

| Threshold | Result | Status |
|-----------|--------|--------|
| P95 latency < 500ms | ${p95Latency.toFixed(2)}ms | ${p95Pass ? '✅ PASS' : '❌ FAIL'} |
| P99 latency < 1000ms | ${p99Latency.toFixed(2)}ms | ${p99Pass ? '✅ PASS' : '❌ FAIL'} |
| Error rate < 1% | ${errorRate}% | ${errorRatePass ? '✅ PASS' : '❌ FAIL'} |

---

## 📈 Detailed Metrics

### HTTP Metrics

| Metric | Count/Value |
|--------|-------------|
| HTTP Requests | ${totalRequests.toLocaleString()} |
| HTTP Failures | ${failedRequests} |
| HTTP Request Duration (avg) | ${avgLatency.toFixed(2)}ms |
| HTTP Request Waiting (avg) | ${(metrics.http_req_waiting?.values?.avg || 0).toFixed(2)}ms |
| HTTP Request Connecting (avg) | ${(metrics.http_req_connecting?.values?.avg || 0).toFixed(2)}ms |
| HTTP Request TLS Handshaking (avg) | ${(metrics.http_req_tls_handshaking?.values?.avg || 0).toFixed(2)}ms |

### Virtual Users

| Metric | Value |
|--------|-------|
| VUs (max) | ${vusMax} |
| VUs (avg) | ${(metrics.vus?.values?.value || 0).toFixed(0)} |

### Iterations

| Metric | Value |
|--------|-------|
| Total Iterations | ${(metrics.iterations?.values?.count || 0).toLocaleString()} |
| Iteration Duration (avg) | ${(metrics.iteration_duration?.values?.avg || 0).toFixed(2)}ms |

---

## 💡 Recommendations

${generateRecommendations(p95Pass, p99Pass, errorRatePass, p95Latency, errorRate)}

---

## 📋 Test Configuration

- **Test Type:** ${testType}
- **Base URL:** ${__ENV.API_BASE_URL || 'http://localhost:9009'}
- **Target RPS:** ${__ENV.TARGET_RPS || '100'}
- **Environment:** ${__ENV.ENVIRONMENT || 'local'}

---

**Report Generated:** ${new Date().toISOString()}  
**K6 Version:** ${data.state.k6Version || 'unknown'}
`;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(p95Pass, p99Pass, errorRatePass, p95Latency, errorRate) {
    const recommendations = [];
    
    if (!p95Pass) {
        recommendations.push(`⚠️ **P95 latency (${p95Latency.toFixed(2)}ms) exceeds target (500ms)**
   - Consider optimizing database queries
   - Review slow endpoints and add caching
   - Check for N+1 query problems`);
    }
    
    if (!p99Pass) {
        recommendations.push(`⚠️ **P99 latency exceeds target (1000ms)**
   - Investigate outliers and edge cases
   - Consider implementing request timeouts
   - Review connection pool sizing`);
    }
    
    if (!errorRatePass) {
        recommendations.push(`🔴 **Error rate (${errorRate}%) exceeds threshold (1%)**
   - Check application logs for errors
   - Verify database connection stability
   - Review API error handling`);
    }
    
    if (p95Pass && p99Pass && errorRatePass) {
        recommendations.push(`✅ **All thresholds passed! System performing well.**
   - Consider stress testing with higher load
   - Monitor these metrics in production
   - Maintain current optimization practices`);
    }
    
    return recommendations.join('\n\n');
}
