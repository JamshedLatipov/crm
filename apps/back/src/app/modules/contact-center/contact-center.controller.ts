import { Controller, Get } from '@nestjs/common';
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
}
