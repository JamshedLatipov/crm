import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { QUEUES, RABBITMQ_CONFIG, SERVICES, JWT_CONFIG } from '@crm/contracts';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database connection (shared with monolith during transition)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'crm'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNC', 'false') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),

    // JWT for token generation and validation
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || JWT_CONFIG.secret,
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || JWT_CONFIG.expiresIn) as any,
        },
      }),
      global: true,
    }),

    // RabbitMQ client for publishing events
    ClientsModule.register([
      {
        name: SERVICES.NOTIFICATION,
        transport: Transport.RMQ,
        options: {
          urls: [process.env['RABBITMQ_URL'] || RABBITMQ_CONFIG.url],
          queue: QUEUES.NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),

    // Feature modules
    UserModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
