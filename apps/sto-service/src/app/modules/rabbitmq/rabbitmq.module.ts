import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCache } from '@libs/shared/sto-types';
import { CrmEventConsumer } from './consumers/crm-event.consumer';
import { StoEventProducer } from './producers/sto-event.producer';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/services/orders.service';
import { CustomerSyncService } from './services/customer-sync.service';
import { CrmIntegrationModule } from '../crm-integration/crm-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerCache]),
    forwardRef(() => OrdersModule),
    CrmIntegrationModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'sto_events',
            queueOptions: {
              durable: true,
            },
            noAck: false,
            prefetchCount: 1,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [CrmEventConsumer, StoEventProducer, CustomerSyncService],
  exports: [StoEventProducer, CustomerSyncService],
})
export class RabbitmqModule implements OnModuleInit {
  constructor(
    private readonly producer: StoEventProducer,
    private readonly ordersService: OrdersService,
  ) {}

  onModuleInit() {
    // Set producer reference in OrdersService
    this.ordersService.setEventProducer(this.producer);
  }
}
