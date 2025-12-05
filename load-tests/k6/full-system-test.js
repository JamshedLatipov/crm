import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export let options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      tags: { test_type: 'smoke' }
    },
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 }
      ],
      tags: { test_type: 'load' },
      startTime: '40s'
    },
    stress: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 150 },
        { duration: '2m', target: 150 },
        { duration: '1m', target: 0 }
      ],
      tags: { test_type: 'stress' },
      startTime: '10m'
    }
  },
  thresholds: {
    'http_req_duration{test_type:smoke}': ['p(95)<500'],
    'http_req_duration{test_type:load}': ['p(95)<1000'],
    'http_req_duration{test_type:stress}': ['p(95)<2000'],
    'http_req_failed': ['rate<0.05'],
    'errors': ['rate<0.05']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const PHONES = ['+79991234567', '+992900010203', '+992927140023'];
const USERNAMES = ['927140023', '992927140023', '992900010203'];

export default function () {
  const phone = PHONES[Math.floor(Math.random() * PHONES.length)];
  const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];

  group('Users API', function () {
    // Get all users
    const usersRes = http.get(`${BASE_URL}/api/users`, {
      tags: { name: 'get-users', endpoint: 'users' }
    });
    check(usersRes, {
      'users status 200': (r) => r.status === 200,
      'users response time < 1000ms': (r) => r.timings.duration < 1000
    }) || errorRate.add(1);

    // Get managers
    const managersRes = http.get(`${BASE_URL}/api/users/managers`, {
      tags: { name: 'get-managers', endpoint: 'users' }
    });
    check(managersRes, {
      'managers status 200': (r) => r.status === 200,
      'managers response time < 800ms': (r) => r.timings.duration < 800
    }) || errorRate.add(1);

    // Get managers stats
    const managersStatsRes = http.get(`${BASE_URL}/api/users/managers/stats`, {
      tags: { name: 'managers-stats', endpoint: 'users' }
    });
    check(managersStatsRes, {
      'managers stats status 200': (r) => r.status === 200,
      'managers stats response time < 800ms': (r) => r.timings.duration < 800
    }) || errorRate.add(1);
  });


  group('Reports API', function () {
    // Leads overview
    const leadsRes = http.get(`${BASE_URL}/api/reports/leads/overview`, {
      tags: { name: 'leads-overview', endpoint: 'reports' }
    });
    check(leadsRes, {
      'leads status 200': (r) => r.status === 200,
      'leads response time < 2000ms': (r) => r.timings.duration < 2000
    }) || errorRate.add(1);

    // Funnel report
    const funnelRes = http.get(`${BASE_URL}/api/reports/funnel`, {
      tags: { name: 'funnel-report', endpoint: 'reports' }
    });
    check(funnelRes, {
      'funnel status 200': (r) => r.status === 200,
      'funnel response time < 2000ms': (r) => r.timings.duration < 2000
    }) || errorRate.add(1);

    // Forecast report
    const forecastRes = http.get(`${BASE_URL}/api/reports/forecast`, {
      tags: { name: 'forecast-report', endpoint: 'reports' }
    });
    check(forecastRes, {
      'forecast status 200': (r) => r.status === 200,
      'forecast response time < 2000ms': (r) => r.timings.duration < 2000
    }) || errorRate.add(1);

    // Tasks report
    const tasksReportRes = http.get(`${BASE_URL}/api/reports/tasks`, {
      tags: { name: 'tasks-report', endpoint: 'reports' }
    });
    check(tasksReportRes, {
      'tasks report status 200': (r) => r.status === 200,
      'tasks report response time < 2000ms': (r) => r.timings.duration < 2000
    }) || errorRate.add(1);
  });

  group('Notifications API', function () {
    // Get notifications
    const notifRes = http.get(`${BASE_URL}/api/notifications`, {
      tags: { name: 'get-notifications', endpoint: 'notifications' }
    });
    check(notifRes, {
      'notifications status 200': (r) => r.status === 200,
      'notifications response time < 800ms': (r) => r.timings.duration < 800
    }) || errorRate.add(1);

    // Unread count
    const unreadRes = http.get(`${BASE_URL}/api/notifications/unread-count`, {
      tags: { name: 'unread-count', endpoint: 'notifications' }
    });
    check(unreadRes, {
      'unread status 200': (r) => r.status === 200,
      'unread response time < 500ms': (r) => r.timings.duration < 500
    }) || errorRate.add(1);
  });

  group('Calls API', function () {
    // Get CDR records
    const cdrRes = http.get(`${BASE_URL}/api/cdr`, {
      tags: { name: 'get-cdr', endpoint: 'calls' }
    });
    check(cdrRes, {
      'cdr status 200': (r) => r.status === 200,
      'cdr response time < 1500ms': (r) => r.timings.duration < 1500
    }) || errorRate.add(1);

    // Get queues
    const queuesRes = http.get(`${BASE_URL}/api/calls/queues`, {
      tags: { name: 'get-queues', endpoint: 'calls' }
    });
    check(queuesRes, {
      'queues status 200': (r) => r.status === 200,
      'queues response time < 1000ms': (r) => r.timings.duration < 1000
    }) || errorRate.add(1);
  });

  // Random sleep between requests
  sleep(Math.random() * 3 + 1);
}