import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PipelineController } from './pipeline.controller';
import { SERVICES } from '@crm/contracts';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICES.DEAL,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: 'deal_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [PipelineController],
})
export class PipelineModule {}
