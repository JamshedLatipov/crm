import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES, QUEUES, RABBITMQ_CONFIG } from '@crm/contracts';
import { LeadModule } from './lead/lead.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'crm'),
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get('DB_LOGGING', 'false') === 'true',
      }),
    }),
    ClientsModule.register([
      {
        name: SERVICES.IDENTITY,
        transport: Transport.RMQ,
        options: {
          urls: [RABBITMQ_CONFIG.url],
          queue: QUEUES.IDENTITY_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.DEAL,
        transport: Transport.RMQ,
        options: {
          urls: [RABBITMQ_CONFIG.url],
          queue: QUEUES.DEAL_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [RABBITMQ_CONFIG.url],
          queue: QUEUES.NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
    LeadModule,
    HealthModule,
  ],
})
export class AppModule {}
