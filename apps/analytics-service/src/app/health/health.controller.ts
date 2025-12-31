import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
    };
  }

  @MessagePattern('analytics.health')
  handleHealthCheck() {
    return { status: 'ok', service: 'analytics-service' };
  }
}
