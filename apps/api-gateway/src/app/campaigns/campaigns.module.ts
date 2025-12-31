import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.CAMPAIGN,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.CAMPAIGN_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [CampaignsController],
})
export class CampaignsModule {}
