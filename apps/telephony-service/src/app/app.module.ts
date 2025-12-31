import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CallModule } from './call/call.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { SERVICES, QUEUES } from '@crm/contracts';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'crm'),
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get('DB_LOGGING', 'false') === 'true',
      }),
      inject: [ConfigService],
    }),
    ClientsModule.register([
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUES.NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
    CallModule,
    QueueModule,
    HealthModule,
  ],
})
export class AppModule {}
