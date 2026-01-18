import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCode, CustomerCache, StoOrder } from '@libs/shared/sto-types';
import { QrCodeService } from './services/qr-code.service';
import { PublicQueueService } from './services/public-queue.service';
import { TrackingService } from './services/tracking.service';
import { QrCodeController } from './controllers/qr-code.controller';
import { PublicQueueController } from './controllers/public-queue.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QrCode, CustomerCache, StoOrder]),
    OrdersModule,
  ],
  controllers: [QrCodeController, PublicQueueController],
  providers: [QrCodeService, PublicQueueService, TrackingService],
  exports: [QrCodeService, TrackingService],
})
export class QrCodesModule {}
