import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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

  @Get('members/my-state')
  getMyState(@Query('userId') userId: string) {
    return this.queueService.getMyQueueState(userId);
  }

  @Get(':name')
  getQueue(@Param('name') name: string) {
    return this.queueService.getQueue(name);
  }

  @Post()
  createQueue(@Body() body: { name: string; strategy?: string }) {
    return this.queueService.createQueue(body);
  }

  @Put(':name')
  updateQueue(@Param('name') name: string, @Body() body: { strategy?: string }) {
    return this.queueService.updateQueue(name, body);
  }

  @Delete(':name')
  deleteQueue(@Param('name') name: string) {
    return this.queueService.deleteQueue(name);
  }

  @Get(':name/members')
  getQueueMembers(@Param('name') name: string) {
    return this.queueService.getQueueMembers(name);
  }

  @Get(':name/members/:extension')
  getQueueMember(@Param('name') name: string, @Param('extension') extension: string) {
    return this.queueService.getQueueMember(name, extension);
  }

  @Put(':name/members/:extension')
  updateQueueMember(
    @Param('name') name: string,
    @Param('extension') extension: string,
    @Body() body: { penalty?: number },
  ) {
    return this.queueService.updateQueueMember(name, extension, body);
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

  @MessagePattern(TELEPHONY_PATTERNS.CREATE_QUEUE)
  handleCreateQueue(@Payload() data: { name: string; strategy?: string }) {
    return this.queueService.createQueue(data);
  }

  @MessagePattern(TELEPHONY_PATTERNS.UPDATE_QUEUE)
  handleUpdateQueue(@Payload() data: { name: string; strategy?: string }) {
    return this.queueService.updateQueue(data.name, { strategy: data.strategy });
  }

  @MessagePattern(TELEPHONY_PATTERNS.DELETE_QUEUE)
  handleDeleteQueue(@Payload() data: { name: string }) {
    return this.queueService.deleteQueue(data.name);
  }

  @MessagePattern(TELEPHONY_PATTERNS.GET_QUEUE_MEMBERS)
  handleGetQueueMembers(@Payload() data: { queueName: string }) {
    return this.queueService.getQueueMembers(data.queueName);
  }

  @MessagePattern(TELEPHONY_PATTERNS.GET_QUEUE_MEMBER)
  handleGetQueueMember(@Payload() data: { queueName: string; extension: string }) {
    return this.queueService.getQueueMember(data.queueName, data.extension);
  }

  @MessagePattern(TELEPHONY_PATTERNS.GET_MY_QUEUE_STATE)
  handleGetMyQueueState(@Payload() data: { userId: string }) {
    return this.queueService.getMyQueueState(data.userId);
  }

  @MessagePattern(TELEPHONY_PATTERNS.UPDATE_QUEUE_MEMBER)
  handleUpdateQueueMember(@Payload() data: { queueName: string; extension: string; penalty?: number }) {
    return this.queueService.updateQueueMember(data.queueName, data.extension, { penalty: data.penalty });
  }
}
