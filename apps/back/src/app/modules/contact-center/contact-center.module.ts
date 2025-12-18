import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactCenterController } from './contact-center.controller';
import { ContactCenterGateway } from './contact-center.gateway';
import { ContactCenterService } from './contact-center.service';
import { Queue } from '../calls/entities/queue.entity';
import { QueueMember } from '../calls/entities/queue-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Queue, QueueMember])],
  controllers: [ContactCenterController],
  providers: [ContactCenterGateway, ContactCenterService],
  exports: [ContactCenterService],
})
export class ContactCenterModule {}
