import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'contact-service',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
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
