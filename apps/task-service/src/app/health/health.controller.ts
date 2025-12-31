import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'task-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  ready() {
    return { status: 'ready' };
  }

  @Get('live')
  live() {
    return { status: 'live' };
  }
}
