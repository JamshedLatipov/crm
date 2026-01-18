import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StoOrder,
  CreateStoOrderDto,
  UpdateStoOrderDto,
  StoOrderStatus,
  StoOrderZone,
} from '@libs/shared/sto-types';
import { QueueManagerService } from './queue-manager.service';

@Injectable()
export class OrdersService {
  private stoQueueGateway: any;
  private stoEventProducer: any;

  constructor(
    @InjectRepository(StoOrder)
    private ordersRepository: Repository<StoOrder>,
    private queueManagerService: QueueManagerService,
  ) {}

  // Setter for gateway (avoids circular dependency)
  setGateway(gateway: any) {
    this.stoQueueGateway = gateway;
  }

  // Setter for event producer (avoids circular dependency)
  setEventProducer(producer: any) {
    this.stoEventProducer = producer;
  }

  async create(createDto: CreateStoOrderDto): Promise<StoOrder> {
    const order = this.ordersRepository.create(createDto);

    // Assign queue numbers
    const queueNumbers = await this.queueManagerService.assignQueueNumber(order);
    order.queueNumber = queueNumbers.queueNumber;
    order.queueNumberInZone = queueNumbers.queueNumberInZone;

    const savedOrder = await this.ordersRepository.save(order);

    // Notify WebSocket clients
    if (this.stoQueueGateway) {
      await this.stoQueueGateway.notifyNewOrder(savedOrder);
    }

    // Publish to RabbitMQ
    if (this.stoEventProducer) {
      await this.stoEventProducer.publishOrderCreated(savedOrder);
    }

    return savedOrder;
  }

  async findAll(filters?: {
    zone?: StoOrderZone;
    status?: StoOrderStatus;
    date?: Date;
  }): Promise<StoOrder[]> {
    const query = this.ordersRepository.createQueryBuilder('order');

    if (filters?.zone) {
      query.andWhere('order.zone = :zone', { zone: filters.zone });
    }

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.date) {
      query.andWhere('DATE(order.createdAt) = DATE(:date)', { date: filters.date });
    } else {
      // Default: today's orders
      query.andWhere('DATE(order.createdAt) = CURRENT_DATE');
    }

    return query
      .orderBy('order.priority', 'DESC')
      .addOrderBy('order.createdAt', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<StoOrder> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async update(id: string, updateDto: UpdateStoOrderDto): Promise<StoOrder> {
    const order = await this.findOne(id);

    const oldStatus = order.status;
    Object.assign(order, updateDto);

    // Handle status changes
    if (updateDto.status && updateDto.status !== oldStatus) {
      await this.handleStatusChange(order, oldStatus, updateDto.status);
    }

    return this.ordersRepository.save(order);
  }

  async updateStatus(id: string, status: StoOrderStatus, mechanicId?: string): Promise<StoOrder> {
    const order = await this.findOne(id);
    const oldStatus = order.status;

    order.status = status;

    if (status === StoOrderStatus.IN_PROGRESS) {
      order.startedAt = new Date();
      if (mechanicId) {
        order.mechanicId = mechanicId;
      }
    }

    if (status === StoOrderStatus.COMPLETED) {
      order.completedAt = new Date();
    }

    await this.handleStatusChange(order, oldStatus, status);

    return this.ordersRepository.save(order);
  }

  async startOrder(id: string, mechanicId: string, bayNumber?: string): Promise<StoOrder> {
    const order = await this.findOne(id);

    if (order.status !== StoOrderStatus.WAITING) {
      throw new BadRequestException('Order must be in WAITING status to start');
    }

    order.status = StoOrderStatus.IN_PROGRESS;
    order.startedAt = new Date();
    order.mechanicId = mechanicId;
    if (bayNumber) {
      order.bayNumber = bayNumber;
    }

    await this.handleStatusChange(order, StoOrderStatus.WAITING, StoOrderStatus.IN_PROGRESS);

    return this.ordersRepository.save(order);
  }

  async completeOrder(id: string): Promise<StoOrder> {
    const order = await this.findOne(id);

    if (order.status !== StoOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Order must be in IN_PROGRESS status to complete');
    }

    order.status = StoOrderStatus.COMPLETED;
    order.completedAt = new Date();

    await this.handleStatusChange(order, StoOrderStatus.IN_PROGRESS, StoOrderStatus.COMPLETED);

    const savedOrder = await this.ordersRepository.save(order);

    // Publish completed event to RabbitMQ
    if (this.stoEventProducer) {
      await this.stoEventProducer.publishOrderCompleted(savedOrder);
    }

    return savedOrder;
  }

  async blockOrder(id: string, reason: string): Promise<StoOrder> {
    const order = await this.findOne(id);

    const oldStatus = order.status;
    order.status = StoOrderStatus.BLOCKED;
    order.blockedReason = reason;

    await this.handleStatusChange(order, oldStatus, StoOrderStatus.BLOCKED);

    return this.ordersRepository.save(order);
  }

  async unblockOrder(id: string): Promise<StoOrder> {
    const order = await this.findOne(id);

    if (order.status !== StoOrderStatus.BLOCKED) {
      throw new BadRequestException('Order is not blocked');
    }

    const oldStatus = order.status;
    order.status = order.startedAt ? StoOrderStatus.IN_PROGRESS : StoOrderStatus.WAITING;
    order.blockedReason = undefined as any;

    await this.handleStatusChange(order, oldStatus, order.status);

    return this.ordersRepository.save(order);
  }

  async cancelOrder(id: string): Promise<StoOrder> {
    const order = await this.findOne(id);

    if (order.status === StoOrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed order');
    }

    const oldStatus = order.status;
    order.status = StoOrderStatus.CANCELLED;

    await this.handleStatusChange(order, oldStatus, StoOrderStatus.CANCELLED);

    return this.ordersRepository.save(order);
  }

  private async handleStatusChange(
    order: StoOrder,
    oldStatus: StoOrderStatus,
    newStatus: StoOrderStatus,
  ): Promise<void> {
    // Notify WebSocket clients
    if (this.stoQueueGateway) {
      await this.stoQueueGateway.notifyOrderStatusChange(order.id, newStatus);
    }

    console.log(`Order ${order.id} status changed: ${oldStatus} -> ${newStatus}`);
  }

  async getCurrentPosition(orderId: string): Promise<number> {
    const order = await this.findOne(orderId);

    if (order.status !== StoOrderStatus.WAITING) {
      return 0;
    }

    const count = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.zone = :zone', { zone: order.zone })
      .andWhere('order.status = :status', { status: StoOrderStatus.WAITING })
      .andWhere('order.createdAt < :createdAt', { createdAt: order.createdAt })
      .andWhere('DATE(order.createdAt) = CURRENT_DATE')
      .getCount();

    return count + 1;
  }

  async getEstimatedWaitMinutes(zone: StoOrderZone): Promise<number> {
    const waitingOrders = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.zone = :zone', { zone })
      .andWhere('order.status = :status', { status: StoOrderStatus.WAITING })
      .andWhere('DATE(order.createdAt) = CURRENT_DATE')
      .getCount();

    // Simple estimation: 30 minutes per order
    return waitingOrders * 30;
  }
}
