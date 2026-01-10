import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES } from '@crm/contracts';
import { CampaignModule } from './campaign/campaign.module';
import { TemplateModule } from './template/template.module';
import { SegmentModule } from './segment/segment.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'crm',
      autoLoadEntities: true,
      synchronize: false,
    }),
    ClientsModule.register([
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_notification_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.CONTACT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_contact_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.LEAD,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_lead_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
    CampaignModule,
    TemplateModule,
    SegmentModule,
    HealthModule,
  ],
})
export class AppModule {}
