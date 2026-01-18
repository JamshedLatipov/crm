import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { StoQueueGateway } from './sto-queue.gateway';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/services/orders.service';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [StoQueueGateway],
  exports: [StoQueueGateway],
})
export class WebsocketModule implements OnModuleInit {
  constructor(
    private readonly gateway: StoQueueGateway,
    private readonly ordersService: OrdersService,
  ) {}

  onModuleInit() {
    // Set gateway reference in OrdersService to avoid circular dependency
    this.ordersService.setGateway(this.gateway);
  }
}
