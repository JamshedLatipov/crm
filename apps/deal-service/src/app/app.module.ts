import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DealModule } from './deal/deal.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { HealthModule } from './health/health.module';
import {
  RABBITMQ_CONFIG,
  IDENTITY_SERVICE,
  IDENTITY_QUEUE,
  CONTACT_SERVICE,
  CONTACT_QUEUE,
  LEAD_SERVICE,
  LEAD_QUEUE,
  NOTIFICATION_SERVICE,
  NOTIFICATION_QUEUE,
} from '@crm/contracts';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'crm',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    ClientsModule.register([
      {
        name: IDENTITY_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || RABBITMQ_CONFIG.url],
          queue: IDENTITY_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: CONTACT_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || RABBITMQ_CONFIG.url],
          queue: CONTACT_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: LEAD_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || RABBITMQ_CONFIG.url],
          queue: LEAD_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: NOTIFICATION_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || RABBITMQ_CONFIG.url],
          queue: NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
    DealModule,
    PipelineModule,
    HealthModule,
  ],
})
export class AppModule {}
