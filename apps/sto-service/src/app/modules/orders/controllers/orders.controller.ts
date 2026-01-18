import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { QueueManagerService } from '../services/queue-manager.service';
import {
  CreateStoOrderDto,
  UpdateStoOrderDto,
  StoOrderZone,
  StoOrderStatus,
} from '@libs/shared/sto-types';

@Controller('sto/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly queueManagerService: QueueManagerService,
  ) {}

  @Post()
  create(@Body() createDto: CreateStoOrderDto) {
    return this.ordersService.create(createDto);
  }

  @Get()
  findAll(
    @Query('zone') zone?: StoOrderZone,
    @Query('status') status?: StoOrderStatus,
  ) {
    return this.ordersService.findAll({ zone, status });
  }

  @Get('stats')
  getStats(@Query('zone') zone?: StoOrderZone) {
    return this.queueManagerService.getQueueStats(zone);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/position')
  getCurrentPosition(@Param('id') id: string) {
    return this.ordersService.getCurrentPosition(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateStoOrderDto) {
    return this.ordersService.update(id, updateDto);
  }

  @Post(':id/start')
  startOrder(
    @Param('id') id: string,
    @Body() body: { mechanicId: string; bayNumber?: string },
  ) {
    return this.ordersService.startOrder(id, body.mechanicId, body.bayNumber);
  }

  @Post(':id/complete')
  completeOrder(@Param('id') id: string) {
    return this.ordersService.completeOrder(id);
  }

  @Post(':id/block')
  blockOrder(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.ordersService.blockOrder(id, body.reason);
  }

  @Post(':id/unblock')
  unblockOrder(@Param('id') id: string) {
    return this.ordersService.unblockOrder(id);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}
