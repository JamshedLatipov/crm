import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'identity-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  ready() {
    // TODO: Add database connectivity check
    return {
      status: 'ready',
      service: 'identity-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  live() {
    return {
      status: 'live',
      service: 'identity-service',
      timestamp: new Date().toISOString(),
    };
  }
}
