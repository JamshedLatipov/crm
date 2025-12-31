import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.ANALYTICS,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.ANALYTICS_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
