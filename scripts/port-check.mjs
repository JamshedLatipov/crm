#!/usr/bin/env node
import net from 'node:net';

const targets = [
  { host: '127.0.0.1', port: 3000, name: 'backend' },
  { host: '127.0.0.1', port: 8089, name: 'asterisk-ari-ws' },
  { host: '127.0.0.1', port: 5060, name: 'sip-udp/tcp (tcp probe)' },
  { host: '127.0.0.1', port: 5432, name: 'postgres' },
  { host: '127.0.0.1', port: 6379, name: 'redis' },
  { host: '127.0.0.1', port: 5672, name: 'rabbitmq' },
  { host: '127.0.0.1', port: 15672, name: 'rabbitmq-mgmt' },
  { host: '127.0.0.1', port: 3478, name: 'turn (tcp)' },
  { host: '127.0.0.1', port: 8443, name: 'asterisk-wss' }
];

function probe({ host, port, name }) {
  return new Promise(resolve => {
    const start = Date.now();
    const sock = net.createConnection({ host, port });
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve({ host, port, name, status: 'timeout', ms: Date.now() - start });
    }, 2500);
    sock.on('connect', () => {
      clearTimeout(timer);
      if (done) return; done = true;
      sock.destroy();
      resolve({ host, port, name, status: 'open', ms: Date.now() - start });
    });
    sock.on('error', (err) => {
      clearTimeout(timer);
      if (done) return; done = true;
      resolve({ host, port, name, status: 'error', error: err.code || err.message, ms: Date.now() - start });
    });
  });
}

const results = await Promise.all(targets.map(probe));
console.table(results.map(r => ({ service: r.name, port: r.port, status: r.status, ms: r.ms, error: r.error || '' })));

const failing = results.filter(r => r.status !== 'open');
if (failing.length) {
  console.error('Some ports not open:', failing.map(f => `${f.name}:${f.port}=${f.status}`).join(', '));
  process.exitCode = 1;
}
