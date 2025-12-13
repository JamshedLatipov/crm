import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      tags: { test_type: 'smoke' }
    },
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 }
      ],
      tags: { test_type: 'spike' },
      startTime: '40s'
    },
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      tags: { test_type: 'soak' },
      startTime: '6m'
    }
  },
  thresholds: {
    'http_req_duration{test_type:smoke}': ['p(95)<300'],
    'http_req_duration{test_type:spike}': ['p(95)<1000'],
    'http_req_duration{test_type:soak}': ['p(95)<500'],
    'http_req_failed': ['rate<0.05']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAMES = ['927140023', '992927140023', '992900010203'];

export default function () {
  const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
  const url = `${BASE_URL}/api/Wallet/GetWalletStatus?username=${username}`;

  const res = http.get(url, {
    tags: { name: 'wallet-status', endpoint: 'wallet' }
  });

  check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'body has isSuccess': (r) => r.body && r.body.indexOf('isSuccess') !== -1
  });

  sleep(Math.random() * 2 + 0.5);
}
