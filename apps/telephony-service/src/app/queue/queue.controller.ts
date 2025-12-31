import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { QueueService } from './queue.service';
import {
  TELEPHONY_PATTERNS,
  AddToQueueDto,
  RemoveFromQueueDto,
  PauseMemberDto,
} from '@crm/contracts';

@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // ============ HTTP Endpoints ============

  @Get()
  getQueues() {
    return this.queueService.getQueues();
  }

  @Get(':name')
  getQueue(@Param('name') name: string) {
    return this.queueService.getQueue(name);
  }

  @Post('add-member')
  addMember(@Body() dto: AddToQueueDto) {
    return this.queueService.addMember(dto);
  }

  @Post('remove-member')
  removeMember(@Body() dto: RemoveFromQueueDto) {
    return this.queueService.removeMember(dto);
  }

  @Post('pause-member')
  pauseMember(@Body() dto: PauseMemberDto) {
    return this.queueService.pauseMember(dto);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(TELEPHONY_PATTERNS.GET_QUEUES)
  handleGetQueues() {
    return this.queueService.getQueues();
  }

  @MessagePattern(TELEPHONY_PATTERNS.GET_QUEUE)
  handleGetQueue(@Payload() data: { name: string }) {
    return this.queueService.getQueue(data.name);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ADD_TO_QUEUE)
  handleAddMember(@Payload() dto: AddToQueueDto) {
    return this.queueService.addMember(dto);
  }

  @MessagePattern(TELEPHONY_PATTERNS.REMOVE_FROM_QUEUE)
  handleRemoveMember(@Payload() dto: RemoveFromQueueDto) {
    return this.queueService.removeMember(dto);
  }

  @MessagePattern(TELEPHONY_PATTERNS.PAUSE_MEMBER)
  handlePauseMember(@Payload() dto: PauseMemberDto) {
    return this.queueService.pauseMember(dto);
  }
}
