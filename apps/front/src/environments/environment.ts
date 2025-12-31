export const environment = {
  production: false,
  // API Gateway endpoint (microservices)
  apiBase: 'http://localhost:3001/api',
  // Legacy monolith endpoint (fallback)
  monolithApiBase: 'http://localhost:3000/api',
  asteriskHost: 'localhost',
  // WebSocket for real-time notifications
  wsUrl: 'ws://localhost:3001',
};
