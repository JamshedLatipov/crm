import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES, RABBITMQ_CONFIG } from '@crm/contracts';
import { CommentsController } from './comments.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.COMMENT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.COMMENT_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [CommentsController],
})
export class CommentsModule {}
