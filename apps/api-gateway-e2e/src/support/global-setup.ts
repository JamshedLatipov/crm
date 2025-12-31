/* eslint-disable */
import { execSync } from 'child_process';

export default async function () {
  console.log('\n🚀 Starting E2E test environment...\n');

  // Check if services are running
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
  
  try {
    execSync(`curl -s ${gatewayUrl}/api/health`, { timeout: 5000 });
    console.log('✅ API Gateway is running');
  } catch (e) {
    console.warn('⚠️ API Gateway is not running. Some tests may fail.');
    console.warn('   Start services with: docker-compose up -d');
  }
}
