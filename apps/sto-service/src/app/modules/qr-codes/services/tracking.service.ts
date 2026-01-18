import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { StoOrder, StoOrderStatus } from '@libs/shared/sto-types';
import { OrdersService } from '../../orders/services/orders.service';
import { Logger } from '@nestjs/common';

export interface TrackingInfo {
  orderId: string;
  queueNumber: number;
  queueNumberInZone: number;
  zone: string;
  status: StoOrderStatus;
  currentPosition: number;
  estimatedWaitMinutes: number;
  canCancel: boolean;
  vehicleMake: string;
  vehicleModel: string;
  workType: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(StoOrder)
    private orderRepo: Repository<StoOrder>,
    private ordersService: OrdersService,
  ) {}

  /**
   * Get order tracking information (public endpoint)
   */
  async getTrackingInfo(orderId: string, phone: string): Promise<TrackingInfo> {
    // Find order
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    // Verify phone number matches
    if (order.customerPhone !== phone) {
      throw new BadRequestException('Неверный номер телефона');
    }

    // Get current position in queue
    let currentPosition = 0;
    if (order.status === StoOrderStatus.WAITING) {
      currentPosition = await this.ordersService.getCurrentPosition(orderId);
    }

    // Get estimated wait time
    const estimatedWaitMinutes = await this.ordersService.getEstimatedWaitMinutes(order.zone);

    // Can cancel only if WAITING
    const canCancel = order.status === StoOrderStatus.WAITING;

    return {
      orderId: order.id,
      queueNumber: order.queueNumber,
      queueNumberInZone: order.queueNumberInZone,
      zone: order.zone,
      status: order.status,
      currentPosition,
      estimatedWaitMinutes,
      canCancel,
      vehicleMake: order.vehicleMake,
      vehicleModel: order.vehicleModel,
      workType: order.workType,
      createdAt: order.createdAt,
      startedAt: order.startedAt,
      completedAt: order.completedAt,
    };
  }

  /**
   * Cancel order by customer (public endpoint)
   */
  async cancelOrder(orderId: string, phone: string): Promise<void> {
    // Find order
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    // Verify phone number matches
    if (order.customerPhone !== phone) {
      throw new BadRequestException('Неверный номер телефона');
    }

    // Can only cancel WAITING orders
    if (order.status !== StoOrderStatus.WAITING) {
      throw new BadRequestException('Можно отменить только ожидающие заказы');
    }

    // Cancel via OrdersService to trigger events
    await this.ordersService.cancelOrder(orderId);

    this.logger.log(`Order cancelled by customer: ${orderId}`);
  }

  /**
   * Get orders by phone (for history)
   */
  async getOrdersByPhone(phone: string): Promise<StoOrder[]> {
    return this.orderRepo.find({
      where: { customerPhone: phone },
      order: { createdAt: 'DESC' },
      take: 10, // Last 10 orders
    });
  }

  /**
   * Check if customer has active order
   */
  async hasActiveOrder(phone: string): Promise<boolean> {
    const count = await this.orderRepo.count({
      where: {
        customerPhone: phone,
        status: StoOrderStatus.WAITING,
        createdAt: LessThan(new Date(Date.now() - 1800000)), // Last 30 minutes
      },
    });

    return count > 0;
  }
}
