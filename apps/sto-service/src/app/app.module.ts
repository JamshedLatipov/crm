import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { OrdersModule } from './modules/orders/orders.module';
import { MechanicsModule } from './modules/mechanics/mechanics.module';
import { DisplayModule } from './modules/display/display.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QrCodesModule } from './modules/qr-codes/qr-codes.module';
import { CrmIntegrationModule } from './modules/crm-integration/crm-integration.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/sto-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'postgres'),
        password: config.get('DATABASE_PASSWORD', 'postgres'),
        database: config.get('DATABASE_NAME', 'sto_db'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 3600000, // 1 hour in milliseconds
      max: 1000, // maximum number of items in cache
    }),
    OrdersModule,
    MechanicsModule,
    DisplayModule,
    NotificationsModule,
    QrCodesModule,
    CrmIntegrationModule,
    WebsocketModule,
    RabbitmqModule,
  ],
})
export class AppModule {}
