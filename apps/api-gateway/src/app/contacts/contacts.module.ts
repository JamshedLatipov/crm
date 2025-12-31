import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES } from '@crm/contracts';
import { ContactsController, CompaniesController } from './contacts.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.CONTACT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.CONTACT_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [ContactsController, CompaniesController],
})
export class ContactsModule {}
