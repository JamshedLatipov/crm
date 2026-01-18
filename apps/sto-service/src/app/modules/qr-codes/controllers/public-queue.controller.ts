import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { QrCodeService } from '../services/qr-code.service';
import { PublicQueueService } from '../services/public-queue.service';
import { TrackingService } from '../services/tracking.service';
import { QueueJoinDto } from '@libs/shared/sto-types';

@Controller('public/queue')
export class PublicQueueController {
  constructor(
    private readonly qrCodeService: QrCodeService,
    private readonly publicQueueService: PublicQueueService,
    private readonly trackingService: TrackingService,
  ) {}

  @Get('info')
  async getQueueInfo(@Query('token') token: string) {
    const qrCode = await this.qrCodeService.findByToken(token);

    if (!qrCode || !qrCode.isValid()) {
      throw new BadRequestException('Invalid or expired QR code');
    }

    // TODO: Get estimated wait time from OrdersService
    return {
      zone: qrCode.zone,
      availableWorkTypes: ['maintenance', 'repair', 'diagnostic', 'bodywork'],
      estimatedWaitMinutes: 30,
    };
  }

  @Post('join')
  async joinQueue(@Body() joinDto: QueueJoinDto) {
    // Validate QR token
    const qrCode = await this.qrCodeService.findByToken(joinDto.token);
    if (!qrCode || !qrCode.isValid()) {
      throw new BadRequestException('Invalid or expired QR code');
    }

    // Check rate limiting (no captcha)
    const canProceed = await this.publicQueueService.checkRateLimit(joinDto.phone);
    if (!canProceed) {
      throw new BadRequestException(
        'Вы уже записаны в очередь. Пожалуйста, подождите 30 минут перед новой записью.'
      );
    }

    // Check rate limit
    const canCreate = await this.publicQueueService.checkRateLimit(joinDto.phone);
    if (!canCreate) {
      throw new BadRequestException('You already have an active order. Please wait.');
    }

    // Find or create customer
    const customer = await this.publicQueueService.findOrCreateCustomer(joinDto.phone);

    // TODO: Create order using OrdersService
    // For now, return mock response
    const orderId = 'mock-order-id';
    const queueNumber = 5;

    // Increment QR usage
    await this.qrCodeService.incrementUsage(qrCode.id);

    return {
      orderId,
      queueNumber,
      estimatedWaitMinutes: 30,
      trackingUrl: `${process.env.PUBLIC_URL}/queue/status/${orderId}`,
    };
  }

  @Get('status/:orderId')
  async getOrderStatus(
    @Param('orderId') orderId: string,
    @Query('phone') phone: string,
  ) {
    // Use TrackingService
    return this.trackingService.getTrackingInfo(orderId, phone);
  }

  @Post('cancel/:orderId')
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() body: { phone: string },
  ) {
    // Use TrackingService to cancel
    await this.trackingService.cancelOrder(orderId, body.phone);
    
    // Clear rate limit when cancelled
    await this.publicQueueService.clearRateLimit(body.phone);
    
    return { success: true, message: 'Заказ успешно отменён' };
  }
}
