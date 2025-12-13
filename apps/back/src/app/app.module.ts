import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MODULES } from './modules';
import { CALLS_MIGRATIONS } from './modules/calls/migrations';
import { USER_MIGRATIONS } from './modules/user/migrations';
import { DEALS_MIGRATIONS } from './modules/deals/migrations';
import { CONTACTS_MIGRATIONS } from './modules/contacts/migrations';
import { COMPANIES_MIGRATIONS } from './modules/companies/migrations';
import { LEADS_MIGRATIONS } from './modules/leads/migrations';
import { COMMENTS_MIGRATIONS } from './modules/comments/migrations';
import { SHARED_MIGRATIONS } from './modules/shared/migrations';
import { TASKS_MIGRATIONS } from './modules/tasks/migrations';
import { ADS_INTEGRATION_MIGRATIONS } from './modules/ads-integration/migrations';
import { PROMO_COMPANIES_MIGRATIONS } from './modules/promo-companies/migrations';
import { CALL_SCRIPTS_MIGRATIONS } from './modules/call-scripts/migrations';
import { USER_ACTIVITY_MIGRATIONS } from './modules/user-activity/migrations';
import { INTEGRATIONS_MIGRATIONS } from './modules/integrations/migrations';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'crm',
      synchronize: true,
      autoLoadEntities: true,
      migrations: [
        ...CALLS_MIGRATIONS,
        ...USER_MIGRATIONS,
        ...DEALS_MIGRATIONS,
        ...CONTACTS_MIGRATIONS,
        ...COMPANIES_MIGRATIONS,
        ...LEADS_MIGRATIONS,
        ...COMMENTS_MIGRATIONS,
        ...SHARED_MIGRATIONS,
        ...TASKS_MIGRATIONS,
        ...ADS_INTEGRATION_MIGRATIONS,
        ...PROMO_COMPANIES_MIGRATIONS,
        ...CALL_SCRIPTS_MIGRATIONS,
        ...USER_ACTIVITY_MIGRATIONS,
        ...INTEGRATIONS_MIGRATIONS,
      ],
      migrationsRun: false,
    }),
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
          queue: process.env.RMQ_QUEUE || 'crm_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
    RedisModule,
    ...MODULES,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
