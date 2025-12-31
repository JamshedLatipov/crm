import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';

import { SERVICES, QUEUES, RABBITMQ_CONFIG, JWT_CONFIG } from '@crm/contracts';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TelephonyModule } from './telephony/telephony.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AuditModule } from './audit/audit.module';
import { ProxyModule } from './proxy/proxy.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // JWT for token validation
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn as any },
      global: true,
    }),

    // RabbitMQ clients for all microservices
    ClientsModule.register([
      {
        name: SERVICES.IDENTITY,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.IDENTITY_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.LEAD,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.LEAD_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.DEAL,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.DEAL_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.CONTACT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.CONTACT_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.TELEPHONY,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.TELEPHONY_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.TASK,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.TASK_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.ANALYTICS,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.ANALYTICS_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.CAMPAIGN,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.CAMPAIGN_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.AUDIT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.AUDIT_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    TasksModule,
    NotificationsModule,
    TelephonyModule,
    AnalyticsModule,
    CampaignsModule,
    AuditModule,
    ProxyModule,
    MetricsModule,
  ],
  exports: [ClientsModule],
})
export class AppModule {}
