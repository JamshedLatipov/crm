import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES } from '@crm/contracts';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { Campaign } from './entities/campaign.entity';
import { Template } from './entities/template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Template]),
    ClientsModule.register([
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_notification_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.CONTACT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_contact_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.LEAD,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_lead_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [CampaignController],
  providers: [CampaignService],
})
export class CampaignModule {}
