import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.IDENTITY,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.IDENTITY_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
