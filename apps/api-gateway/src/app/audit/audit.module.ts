import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { AuditController } from './audit.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.AUDIT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.AUDIT_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AuditController],
})
export class AuditModule {}
