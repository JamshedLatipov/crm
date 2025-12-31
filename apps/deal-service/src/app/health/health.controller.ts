import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DEAL_PATTERNS } from '@crm/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'deal-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'deal-service' };
  }

  @Get('live')
  live() {
    return { status: 'live', service: 'deal-service' };
  }

  @MessagePattern(DEAL_PATTERNS.HEALTH)
  handleHealth() {
    return { status: 'ok', service: 'deal-service', timestamp: new Date().toISOString() };
  }
}
