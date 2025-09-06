# Performance and Load Testing Script
#!/bin/bash

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVER_URL="${1:-http://localhost:3000}"
RESULTS_DIR="./performance-results"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if server is running
check_server() {
    log_info "Checking if server is available at $SERVER_URL..."
    if ! curl -sf "$SERVER_URL/health" > /dev/null; then
        log_error "Server is not available at $SERVER_URL"
        log_info "Please start the server first with: deno task start"
        exit 1
    fi
    log_info "Server is available"
}

# Install k6 if not available
install_k6() {
    if ! command -v k6 &> /dev/null; then
        log_warn "k6 not found, attempting to install..."
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install k6
            else
                log_error "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y gnupg software-properties-common
                sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
                echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
                sudo apt-get update
                sudo apt-get install k6
            else
                log_error "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
                exit 1
            fi
        else
            log_error "Unsupported OS. Please install k6 manually: https://k6.io/docs/getting-started/installation/"
            exit 1
        fi
    fi
}

# Basic load test
run_basic_load_test() {
    log_info "Running basic load test..."
    
    cat > "$RESULTS_DIR/basic-load-test.js" << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be below 10%
  },
};

export default function() {
  let response = http.get('$SERVER_URL/');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

    k6 run --out json="$RESULTS_DIR/basic-load-results.json" "$RESULTS_DIR/basic-load-test.js"
    log_info "Basic load test completed"
}

# Stress test
run_stress_test() {
    log_info "Running stress test..."
    
    cat > "$RESULTS_DIR/stress-test.js" << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
  },
};

export default function() {
  let response = http.get('$SERVER_URL/');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  sleep(0.5);
}
EOF

    k6 run --out json="$RESULTS_DIR/stress-test-results.json" "$RESULTS_DIR/stress-test.js"
    log_info "Stress test completed"
}

# WebSocket test
run_websocket_test() {
    log_info "Running WebSocket test..."
    
    cat > "$RESULTS_DIR/websocket-test.js" << EOF
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 concurrent WebSocket connections
    { duration: '2m', target: 20 },  // Maintain 20 connections
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function() {
  const wsUrl = '$SERVER_URL/ws'.replace('http', 'ws');
  
  const response = ws.connect(wsUrl, function(socket) {
    socket.on('open', function() {
      console.log('WebSocket connection opened');
      
      // Send a test message
      socket.send(JSON.stringify({
        type: 'server-event',
        component: 'route',
        event: 'ping',
        payload: { test: true }
      }));
    });

    socket.on('message', function(message) {
      const data = JSON.parse(message);
      check(data, {
        'received response': (d) => d.type === 'event-result',
      });
    });

    socket.on('close', function() {
      console.log('WebSocket connection closed');
    });

    socket.setTimeout(function() {
      socket.close();
    }, 10000); // Close after 10 seconds
  });

  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}
EOF

    k6 run --out json="$RESULTS_DIR/websocket-test-results.json" "$RESULTS_DIR/websocket-test.js"
    log_info "WebSocket test completed"
}

# API endpoint test
run_api_test() {
    log_info "Running API endpoint test..."
    
    cat > "$RESULTS_DIR/api-test.js" << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 30 },  // Ramp up
    { duration: '1m', target: 30 },   // Stay at 30 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function() {
  // Test health endpoint
  let healthResponse = http.get('$SERVER_URL/health');
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });

  // Test main page
  let mainResponse = http.get('$SERVER_URL/');
  check(mainResponse, {
    'main page status is 200': (r) => r.status === 200,
    'main page is HTML': (r) => r.headers['Content-Type'].includes('text/html'),
  });

  sleep(1);
}
EOF

    k6 run --out json="$RESULTS_DIR/api-test-results.json" "$RESULTS_DIR/api-test.js"
    log_info "API endpoint test completed"
}

# Generate summary report
generate_report() {
    log_info "Generating performance report..."
    
    cat > "$RESULTS_DIR/performance-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Weblisk Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { margin: 10px 0; }
        .pass { color: green; }
        .fail { color: red; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Weblisk Performance Test Report</h1>
    <p>Generated on: $(date)</p>
    <p>Server URL: $SERVER_URL</p>
    
    <div class="test-section">
        <h2>Test Summary</h2>
        <p>Performance tests completed for Weblisk framework.</p>
        <ul>
            <li>Basic Load Test - Simulates normal user load</li>
            <li>Stress Test - Tests system limits</li>
            <li>WebSocket Test - Tests real-time capabilities</li>
            <li>API Test - Tests endpoint reliability</li>
        </ul>
    </div>
    
    <div class="test-section">
        <h2>Test Results</h2>
        <p>Detailed results are available in JSON format:</p>
        <ul>
            <li><a href="basic-load-results.json">Basic Load Test Results</a></li>
            <li><a href="stress-test-results.json">Stress Test Results</a></li>
            <li><a href="websocket-test-results.json">WebSocket Test Results</a></li>
            <li><a href="api-test-results.json">API Test Results</a></li>
        </ul>
    </div>
    
    <div class="test-section">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor response times under different load conditions</li>
            <li>Set up alerts for error rates above 5%</li>
            <li>Consider implementing caching for static content</li>
            <li>Monitor WebSocket connection stability</li>
            <li>Scale horizontally if response times degrade</li>
        </ul>
    </div>
</body>
</html>
EOF

    log_info "Performance report generated: $RESULTS_DIR/performance-report.html"
}

# Main execution
main() {
    log_info "Starting performance tests for Weblisk framework"
    log_info "Server URL: $SERVER_URL"
    
    check_server
    install_k6
    
    run_basic_load_test
    run_stress_test
    run_websocket_test
    run_api_test
    
    generate_report
    
    log_info "All performance tests completed!"
    log_info "Results available in: $RESULTS_DIR/"
    log_info "Open $RESULTS_DIR/performance-report.html to view the summary"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
