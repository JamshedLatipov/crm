import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { LeadsController } from './leads.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.LEAD,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.LEAD_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [LeadsController],
})
export class LeadsModule {}
