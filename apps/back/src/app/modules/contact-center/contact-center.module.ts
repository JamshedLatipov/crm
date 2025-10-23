import { Module } from '@nestjs/common';
import { ContactCenterController } from './contact-center.controller';
import { ContactCenterGateway } from './contact-center.gateway';
import { ContactCenterService } from './contact-center.service';

@Module({
  controllers: [ContactCenterController],
  providers: [ContactCenterGateway, ContactCenterService],
  exports: [ContactCenterService],
})
export class ContactCenterModule {}
