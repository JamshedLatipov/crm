import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.TASK,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.TASK_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [TasksController],
})
export class TasksModule {}
