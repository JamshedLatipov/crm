import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { DealsController, PipelineController } from './deals.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.DEAL,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.DEAL_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [DealsController, PipelineController],
})
export class DealsModule {}
