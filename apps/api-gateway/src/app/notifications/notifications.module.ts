import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
