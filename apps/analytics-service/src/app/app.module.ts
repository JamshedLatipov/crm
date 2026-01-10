import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES } from '@crm/contracts';
import { AnalyticsModule } from './analytics/analytics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { ForecastingModule } from './forecasting/forecasting.module';

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
        name: SERVICES.IDENTITY,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_identity_queue',
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
      {
        name: SERVICES.DEAL,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_deal_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.TELEPHONY,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'crm_telephony_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
    AnalyticsModule,
    DashboardModule,
    ReportsModule,
    HealthModule,
    ForecastingModule,
  ],
})
export class AppModule {}
