import { Controller, Get, Query } from '@nestjs/common';
import { ContactCenterService } from './contact-center.service';

@Controller('contact-center')
export class ContactCenterController {
  constructor(private readonly svc: ContactCenterService) {}

  @Get('operators')
  getOperators() {
    return this.svc.getOperatorsSnapshot();
  }

  @Get('queues')
  getQueues() {
    return this.svc.getQueuesSnapshot();
  }

  @Get('active-calls')
  getActiveCalls() {
    return this.svc.getActiveCalls();
  }

  @Get('debug/cdr-sample')
  async getDebugCdrSample(@Query('limit') limit?: string) {
    return this.svc.getDebugCdrSample(parseInt(limit || '10', 10));
  }

  @Get('debug/cdr-all')
  async getDebugCdrAll(@Query('limit') limit?: string) {
    return this.svc.getDebugCdrAll(parseInt(limit || '10', 10));
  }

  @Get('debug/members')
  async getDebugMembers() {
    return this.svc.getDebugMembers();
  }
}
