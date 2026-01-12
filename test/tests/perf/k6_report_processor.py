#!/usr/bin/env python3
"""
K6 Report Processor - Python-based report generator for k6 performance tests
Reads k6 JSON output and generates comprehensive reports in HTML, Markdown, and JSON formats.

Copyright (c) 2025 Hal Ng
All Rights Reserved.
"""

import json
import sys
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple


class K6ReportProcessor:
    """Process k6 JSON output and generate comprehensive reports"""
    
    def __init__(self, json_file: str, test_type: str = 'baseline', environment: str = 'local'):
        """
        Initialize report processor
        
        Args:
            json_file: Path to k6 JSON output file
            test_type: Type of test (baseline, stress, spike, soak)
            environment: Environment name (local, staging, prod)
        """
        self.json_file = json_file
        self.test_type = test_type.lower()
        self.environment = environment
        self.data = self._load_json()
        self.metrics = self._extract_metrics()
        
    def _load_json(self) -> Dict[str, Any]:
        """Load k6 JSON output"""
        try:
            with open(self.json_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"❌ Error: File '{self.json_file}' not found")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Error: Invalid JSON in '{self.json_file}': {e}")
            sys.exit(1)
    
    def _extract_metrics(self) -> Dict[str, Any]:
        """Extract key metrics from k6 data"""
        metrics = self.data.get('metrics', {})
        
        # HTTP metrics
        http_reqs = metrics.get('http_reqs', {}).get('values', {}).get('count', 0)
        http_req_failed = metrics.get('http_req_failed', {}).get('values', {}).get('passes', 0)
        
        # Latency metrics (in milliseconds)
        http_req_duration = metrics.get('http_req_duration', {}).get('values', {})
        p50 = http_req_duration.get('med', 0)
        p90 = http_req_duration.get('p(90)', 0)
        p95 = http_req_duration.get('p(95)', 0)
        p99 = http_req_duration.get('p(99)', 0)
        avg = http_req_duration.get('avg', 0)
        max_latency = http_req_duration.get('max', 0)
        
        # Virtual users
        vus_max = metrics.get('vus_max', {}).get('values', {}).get('max', 0)
        vus_avg = metrics.get('vus', {}).get('values', {}).get('value', 0)
        
        # Test duration
        test_duration = self.data.get('state', {}).get('testRunDurationMs', 0) / 1000
        
        # Data transfer
        data_received = metrics.get('data_received', {}).get('values', {}).get('count', 0)
        data_sent = metrics.get('data_sent', {}).get('values', {}).get('count', 0)
        
        # Iterations
        iterations = metrics.get('iterations', {}).get('values', {}).get('count', 0)
        iteration_duration = metrics.get('iteration_duration', {}).get('values', {}).get('avg', 0)
        
        # Other metrics
        http_req_waiting = metrics.get('http_req_waiting', {}).get('values', {}).get('avg', 0)
        http_req_connecting = metrics.get('http_req_connecting', {}).get('values', {}).get('avg', 0)
        http_req_tls_handshaking = metrics.get('http_req_tls_handshaking', {}).get('values', {}).get('avg', 0)
        
        # Calculate derived metrics
        error_rate = (http_req_failed / http_reqs * 100) if http_reqs > 0 else 0
        throughput = http_reqs / test_duration if test_duration > 0 else 0
        
        return {
            'total_requests': http_reqs,
            'failed_requests': http_req_failed,
            'error_rate': error_rate,
            'p50': p50,
            'p90': p90,
            'p95': p95,
            'p99': p99,
            'avg_latency': avg,
            'max_latency': max_latency,
            'vus_max': vus_max,
            'vus_avg': vus_avg,
            'test_duration': test_duration,
            'data_received_mb': data_received / 1024 / 1024,
            'data_sent_mb': data_sent / 1024 / 1024,
            'throughput': throughput,
            'iterations': iterations,
            'iteration_duration': iteration_duration,
            'http_req_waiting': http_req_waiting,
            'http_req_connecting': http_req_connecting,
            'http_req_tls_handshaking': http_req_tls_handshaking,
        }
    
    def check_thresholds(self) -> Tuple[bool, bool, bool, bool]:
        """
        Check if test passes defined thresholds
        
        Returns:
            Tuple of (p95_pass, p99_pass, error_rate_pass, overall_pass)
        """
        p95_pass = self.metrics['p95'] < 500
        p99_pass = self.metrics['p99'] < 1000
        error_rate_pass = self.metrics['error_rate'] < 1.0
        overall_pass = p95_pass and p99_pass and error_rate_pass
        
        return p95_pass, p99_pass, error_rate_pass, overall_pass
    
    def test_passed(self) -> bool:
        """Check if test passed all thresholds"""
        _, _, _, overall_pass = self.check_thresholds()
        return overall_pass
    
    def get_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        p95_pass, p99_pass, error_rate_pass, _ = self.check_thresholds()
        recommendations = []
        
        if not p95_pass:
            recommendations.append(
                f"⚠️ **P95 latency ({self.metrics['p95']:.2f}ms) exceeds target (500ms)**\n"
                "   - Consider optimizing database queries\n"
                "   - Review slow endpoints and add caching\n"
                "   - Check for N+1 query problems"
            )
        
        if not p99_pass:
            recommendations.append(
                "⚠️ **P99 latency exceeds target (1000ms)**\n"
                "   - Investigate outliers and edge cases\n"
                "   - Consider implementing request timeouts\n"
                "   - Review connection pool sizing"
            )
        
        if not error_rate_pass:
            recommendations.append(
                f"🔴 **Error rate ({self.metrics['error_rate']:.2f}%) exceeds threshold (1%)**\n"
                "   - Check application logs for errors\n"
                "   - Verify database connection stability\n"
                "   - Review API error handling"
            )
        
        if p95_pass and p99_pass and error_rate_pass:
            recommendations.append(
                "✅ **All thresholds passed! System performing well.**\n"
                "   - Consider stress testing with higher load\n"
                "   - Monitor these metrics in production\n"
                "   - Maintain current optimization practices"
            )
        
        return recommendations
    
    def generate_markdown_report(self, output_file: str = None) -> str:
        """Generate Markdown report"""
        p95_pass, p99_pass, error_rate_pass, overall_pass = self.check_thresholds()
        m = self.metrics
        
        status_icon = '🟢' if overall_pass else '🔴'
        status_text = 'PASSED' if overall_pass else 'FAILED'
        timestamp = datetime.now().isoformat()
        
        # Build Markdown report
        report = f"""# K6 Performance Test Report - {self.test_type.upper()}

**Generated:** {timestamp}  
**Test Type:** {self.test_type}  
**Duration:** {m['test_duration']:.2f}s  
**Environment:** {self.environment}  
**Status:** {status_icon} **{status_text}**

---

## 📊 Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Requests** | {m['total_requests']:,} | - | ℹ️ |
| **Failed Requests** | {m['failed_requests']} | < 1% | {'✅' if error_rate_pass else '❌'} |
| **Error Rate** | {m['error_rate']:.2f}% | < 1% | {'✅' if error_rate_pass else '❌'} |
| **Peak VUs** | {m['vus_max']} | - | ℹ️ |
| **Test Duration** | {m['test_duration']:.2f}s | - | ℹ️ |

### Overall Status: {status_icon} {status_text}

---

## ⚡ Performance Metrics

### Latency (HTTP Request Duration)

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| **Average** | {m['avg_latency']:.2f}ms | < 200ms | {'✅' if m['avg_latency'] < 200 else '⚠️' if m['avg_latency'] < 500 else '❌'} |
| **P50 (Median)** | {m['p50']:.2f}ms | < 100ms | {'✅' if m['p50'] < 100 else '⚠️'} |
| **P90** | {m['p90']:.2f}ms | < 300ms | {'✅' if m['p90'] < 300 else '⚠️'} |
| **P95** | {m['p95']:.2f}ms | **< 500ms** | {'✅' if p95_pass else '❌'} |
| **P99** | {m['p99']:.2f}ms | **< 1000ms** | {'✅' if p99_pass else '❌'} |
| **Max** | {m['max_latency']:.2f}ms | - | ℹ️ |

### Throughput

| Metric | Value |
|--------|-------|
| **Requests/Second** | {m['throughput']:.2f} RPS |
| **Data Received** | {m['data_received_mb']:.2f} MB |
| **Data Sent** | {m['data_sent_mb']:.2f} MB |

---

## 🎯 Threshold Compliance

| Threshold | Result | Status |
|-----------|--------|--------|
| P95 latency < 500ms | {m['p95']:.2f}ms | {'✅ PASS' if p95_pass else '❌ FAIL'} |
| P99 latency < 1000ms | {m['p99']:.2f}ms | {'✅ PASS' if p99_pass else '❌ FAIL'} |
| Error rate < 1% | {m['error_rate']:.2f}% | {'✅ PASS' if error_rate_pass else '❌ FAIL'} |

---

## 📈 Detailed Metrics

### HTTP Metrics

| Metric | Count/Value |
|--------|-------------|
| HTTP Requests | {m['total_requests']:,} |
| HTTP Failures | {m['failed_requests']} |
| HTTP Request Duration (avg) | {m['avg_latency']:.2f}ms |
| HTTP Request Waiting (avg) | {m['http_req_waiting']:.2f}ms |
| HTTP Request Connecting (avg) | {m['http_req_connecting']:.2f}ms |
| HTTP Request TLS Handshaking (avg) | {m['http_req_tls_handshaking']:.2f}ms |

### Virtual Users

| Metric | Value |
|--------|-------|
| VUs (max) | {m['vus_max']} |
| VUs (avg) | {m['vus_avg']:.0f} |

### Iterations

| Metric | Value |
|--------|-------|
| Total Iterations | {m['iterations']:,} |
| Iteration Duration (avg) | {m['iteration_duration']:.2f}ms |

---

## 💡 Recommendations

{chr(10).join(self.get_recommendations())}

---

## 📋 Test Configuration

- **Test Type:** {self.test_type}
- **Environment:** {self.environment}
- **K6 Version:** {self.data.get('state', {}).get('k6Version', 'unknown')}

---

**Report Generated:** {datetime.now().isoformat()}  
**Generated By:** Python K6 Report Processor
"""
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(report)
            print(f"✅ Markdown report generated: {output_file}")
        
        return report
    
    def generate_html_report(self, output_file: str = None) -> str:
        """Generate HTML report"""
        p95_pass, p99_pass, error_rate_pass, overall_pass = self.check_thresholds()
        m = self.metrics
        
        status_color = '#10b981' if overall_pass else '#ef4444'
        status_text = 'PASSED' if overall_pass else 'FAILED'
        timestamp = datetime.now().isoformat()
        
        # Build HTML report
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 {self.test_type.capitalize()} Performance Test Report</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        .status {{
            font-size: 1.5em;
            font-weight: bold;
            color: {status_color};
            margin-top: 20px;
        }}
        .section {{
            background: white;
            padding: 30px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .section h2 {{
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }}
        .section h3 {{
            color: #764ba2;
            margin: 20px 0 10px 0;
            font-size: 1.3em;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background: #667eea;
            color: white;
            font-weight: bold;
        }}
        tr:hover {{
            background: #f9f9f9;
        }}
        .metric-good {{
            color: #10b981;
            font-weight: bold;
        }}
        .metric-warning {{
            color: #f59e0b;
            font-weight: bold;
        }}
        .metric-bad {{
            color: #ef4444;
            font-weight: bold;
        }}
        .info-box {{
            background: #e0e7ff;
            padding: 15px;
            border-left: 4px solid #667eea;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .warning-box {{
            background: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .error-box {{
            background: #fee2e2;
            padding: 15px;
            border-left: 4px solid #ef4444;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .success-box {{
            background: #d1fae5;
            padding: 15px;
            border-left: 4px solid #10b981;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>K6 Performance Test Report</h1>
            <p><strong>Test Type:</strong> {self.test_type.upper()}</p>
            <p><strong>Environment:</strong> {self.environment}</p>
            <p><strong>Generated:</strong> {timestamp}</p>
            <div class="status">Status: {status_text}</div>
        </div>
        
        <div class="section">
            <h2>📊 Executive Summary</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Target</th>
                    <th>Status</th>
                </tr>
                <tr>
                    <td>Total Requests</td>
                    <td>{m['total_requests']:,}</td>
                    <td>-</td>
                    <td>ℹ️</td>
                </tr>
                <tr>
                    <td>Failed Requests</td>
                    <td>{m['failed_requests']}</td>
                    <td>&lt; 1%</td>
                    <td class="{'metric-good' if error_rate_pass else 'metric-bad'}">{'✅' if error_rate_pass else '❌'}</td>
                </tr>
                <tr>
                    <td>Error Rate</td>
                    <td>{m['error_rate']:.2f}%</td>
                    <td>&lt; 1%</td>
                    <td class="{'metric-good' if error_rate_pass else 'metric-bad'}">{'✅' if error_rate_pass else '❌'}</td>
                </tr>
                <tr>
                    <td>Peak Virtual Users</td>
                    <td>{m['vus_max']}</td>
                    <td>-</td>
                    <td>ℹ️</td>
                </tr>
                <tr>
                    <td>Test Duration</td>
                    <td>{m['test_duration']:.2f}s</td>
                    <td>-</td>
                    <td>ℹ️</td>
                </tr>
            </table>
        </div>
        
        <div class="section">
            <h2>⚡ Performance Metrics</h2>
            <h3>Latency (HTTP Request Duration)</h3>
            <table>
                <tr>
                    <th>Percentile</th>
                    <th>Value</th>
                    <th>Target</th>
                    <th>Status</th>
                </tr>
                <tr>
                    <td>Average</td>
                    <td>{m['avg_latency']:.2f}ms</td>
                    <td>&lt; 200ms</td>
                    <td class="{'metric-good' if m['avg_latency'] < 200 else 'metric-warning' if m['avg_latency'] < 500 else 'metric-bad'}">
                        {'✅' if m['avg_latency'] < 200 else '⚠️' if m['avg_latency'] < 500 else '❌'}
                    </td>
                </tr>
                <tr>
                    <td>P50 (Median)</td>
                    <td>{m['p50']:.2f}ms</td>
                    <td>&lt; 100ms</td>
                    <td class="{'metric-good' if m['p50'] < 100 else 'metric-warning'}">{'✅' if m['p50'] < 100 else '⚠️'}</td>
                </tr>
                <tr>
                    <td>P90</td>
                    <td>{m['p90']:.2f}ms</td>
                    <td>&lt; 300ms</td>
                    <td class="{'metric-good' if m['p90'] < 300 else 'metric-warning'}">{'✅' if m['p90'] < 300 else '⚠️'}</td>
                </tr>
                <tr>
                    <td><strong>P95</strong></td>
                    <td><strong>{m['p95']:.2f}ms</strong></td>
                    <td><strong>&lt; 500ms</strong></td>
                    <td class="{'metric-good' if p95_pass else 'metric-bad'}"><strong>{'✅' if p95_pass else '❌'}</strong></td>
                </tr>
                <tr>
                    <td><strong>P99</strong></td>
                    <td><strong>{m['p99']:.2f}ms</strong></td>
                    <td><strong>&lt; 1000ms</strong></td>
                    <td class="{'metric-good' if p99_pass else 'metric-bad'}"><strong>{'✅' if p99_pass else '❌'}</strong></td>
                </tr>
                <tr>
                    <td>Max</td>
                    <td>{m['max_latency']:.2f}ms</td>
                    <td>-</td>
                    <td>ℹ️</td>
                </tr>
            </table>
            
            <h3>Throughput</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Requests/Second</td>
                    <td>{m['throughput']:.2f} RPS</td>
                </tr>
                <tr>
                    <td>Data Received</td>
                    <td>{m['data_received_mb']:.2f} MB</td>
                </tr>
                <tr>
                    <td>Data Sent</td>
                    <td>{m['data_sent_mb']:.2f} MB</td>
                </tr>
            </table>
        </div>
        
        <div class="section">
            <h2>🎯 Threshold Compliance</h2>
            <table>
                <tr>
                    <th>Threshold</th>
                    <th>Result</th>
                    <th>Status</th>
                </tr>
                <tr>
                    <td>P95 latency &lt; 500ms</td>
                    <td>{m['p95']:.2f}ms</td>
                    <td class="{'metric-good' if p95_pass else 'metric-bad'}">{'✅ PASS' if p95_pass else '❌ FAIL'}</td>
                </tr>
                <tr>
                    <td>P99 latency &lt; 1000ms</td>
                    <td>{m['p99']:.2f}ms</td>
                    <td class="{'metric-good' if p99_pass else 'metric-bad'}">{'✅ PASS' if p99_pass else '❌ FAIL'}</td>
                </tr>
                <tr>
                    <td>Error rate &lt; 1%</td>
                    <td>{m['error_rate']:.2f}%</td>
                    <td class="{'metric-good' if error_rate_pass else 'metric-bad'}">{'✅ PASS' if error_rate_pass else '❌ FAIL'}</td>
                </tr>
            </table>
        </div>
        
        <div class="section">
            <h2>💡 Recommendations</h2>
"""
        
        # Add recommendations
        for rec in self.get_recommendations():
            if '✅' in rec:
                html += f'            <div class="success-box">{rec}</div>\n'
            elif '🔴' in rec:
                html += f'            <div class="error-box">{rec}</div>\n'
            else:
                html += f'            <div class="warning-box">{rec}</div>\n'
        
        html += """        </div>
        
        <div class="footer">
            <p><strong>Report Generated:</strong> """ + datetime.now().isoformat() + """</p>
            <p>Generated by Python K6 Report Processor</p>
        </div>
    </div>
</body>
</html>
"""
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(html)
            print(f"✅ HTML report generated: {output_file}")
        
        return html
    
    def generate_json_report(self, output_file: str = None) -> str:
        """Generate enhanced JSON report"""
        p95_pass, p99_pass, error_rate_pass, overall_pass = self.check_thresholds()
        
        report_data = {
            'test_info': {
                'test_type': self.test_type,
                'environment': self.environment,
                'timestamp': datetime.now().isoformat(),
                'k6_version': self.data.get('state', {}).get('k6Version', 'unknown'),
            },
            'metrics': self.metrics,
            'thresholds': {
                'p95_latency': {
                    'value': self.metrics['p95'],
                    'target': 500,
                    'passed': p95_pass,
                },
                'p99_latency': {
                    'value': self.metrics['p99'],
                    'target': 1000,
                    'passed': p99_pass,
                },
                'error_rate': {
                    'value': self.metrics['error_rate'],
                    'target': 1.0,
                    'passed': error_rate_pass,
                },
            },
            'overall_status': {
                'passed': overall_pass,
                'status': 'PASSED' if overall_pass else 'FAILED',
            },
            'recommendations': self.get_recommendations(),
            'raw_data': self.data,
        }
        
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report_data, f, indent=2)
            print(f"✅ JSON report generated: {output_file}")
        
        return json.dumps(report_data, indent=2)


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Process k6 JSON output and generate comprehensive reports'
    )
    parser.add_argument(
        'json_file',
        help='Path to k6 JSON output file'
    )
    parser.add_argument(
        '--test-type',
        default='baseline',
        choices=['baseline', 'stress', 'spike', 'soak'],
        help='Type of performance test (default: baseline)'
    )
    parser.add_argument(
        '--output-dir',
        default='.',
        help='Output directory for reports (default: current directory)'
    )
    parser.add_argument(
        '--environment',
        default='local',
        help='Environment name (default: local)'
    )
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate timestamp for output files
    timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
    base_name = f"k6_{args.test_type}_report_{timestamp}_processed"
    
    # Create processor
    print(f"\n🔄 Processing k6 results from: {args.json_file}")
    processor = K6ReportProcessor(
        args.json_file,
        test_type=args.test_type,
        environment=args.environment
    )
    
    # Generate reports
    print(f"\n📄 Generating reports in: {output_dir}")
    html_file = output_dir / f"{base_name}.html"
    md_file = output_dir / f"{base_name}.md"
    json_file = output_dir / f"{base_name}.json"
    
    processor.generate_html_report(str(html_file))
    processor.generate_markdown_report(str(md_file))
    processor.generate_json_report(str(json_file))
    
    # Print summary
    print("\n" + "="*60)
    if processor.test_passed():
        print("✅ Test PASSED - All thresholds met!")
    else:
        print("❌ Test FAILED - Some thresholds not met")
        print("\nRecommendations:")
        for rec in processor.get_recommendations():
            print(f"  {rec}")
    print("="*60 + "\n")
    
    # Exit with appropriate code
    sys.exit(0 if processor.test_passed() else 1)


if __name__ == '__main__':
    main()
