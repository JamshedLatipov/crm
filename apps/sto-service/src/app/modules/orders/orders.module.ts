import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoOrder } from '@libs/shared/sto-types';
import { OrdersService } from './services/orders.service';
import { QueueManagerService } from './services/queue-manager.service';
import { OrdersController } from './controllers/orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoOrder])],
  controllers: [OrdersController],
  providers: [OrdersService, QueueManagerService],
  exports: [OrdersService, QueueManagerService],
})
export class OrdersModule {}
