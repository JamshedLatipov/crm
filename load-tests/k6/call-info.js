import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 20 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<700'],
    'http_req_failed': ['rate<0.02']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PHONE = __ENV.PHONE || '+79991234567';

export default function () {
  const url = `${BASE_URL}/api/integrations/call-info/${encodeURIComponent(PHONE)}`;
  const res = http.get(url, { tags: { name: 'call-info' } });

  check(res, {
    'status 200': (r) => r.status === 200,
    'response contains sections': (r) => r.json && r.json().hasOwnProperty('sections')
  });

  sleep(Math.random() * 2 + 0.5);
}
