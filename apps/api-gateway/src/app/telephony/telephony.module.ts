import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QUEUES } from '@crm/contracts';
import { TelephonyController } from './telephony.controller';

const TELEPHONY_SERVICE = 'TELEPHONY_SERVICE';
const TELEPHONY_QUEUE = 'crm_telephony_queue';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: TELEPHONY_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: TELEPHONY_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [TelephonyController],
})
export class TelephonyModule {}
