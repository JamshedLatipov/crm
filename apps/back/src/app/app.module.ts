import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
  // NOTE: project policy changed — migration lists now include only seeder
  // migrations (data/seed insertions). Structural/schema migrations were
  // removed from module migration exports so that schema changes are
  // performed via `synchronize` during development or applied manually in
  // controlled deployments. Keep `migrations` here for seed runners only.
  TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'crm',
      // Disable automatic schema synchronization in the containerized runtime
      // to avoid runtime attempts to add non-nullable columns to tables
      // with existing data. Migrations are used for data seeding and schema
      // changes in controlled deployments.
      synchronize: true,
      autoLoadEntities: true,
      extra: {
        timezone: 'UTC',
      },
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
      migrationsRun: true,
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
    EventEmitterModule.forRoot(),
    ...MODULES,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
