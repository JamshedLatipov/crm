import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CallService } from './call.service';
import {
  TELEPHONY_PATTERNS,
  CallLogFilterDto,
  UpdateCallLogDto,
  OriginateCallDto,
  HangupCallDto,
} from '@crm/contracts';

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: CallLogFilterDto) {
    return this.callService.findAll(filter);
  }

  @Get('stats')
  getStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.callService.getStats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCallLogDto) {
    return this.callService.update(id, dto);
  }

  @Post('originate')
  originate(@Body() dto: OriginateCallDto) {
    return this.callService.originate(dto);
  }

  @Post('hangup')
  hangup(@Body() dto: HangupCallDto) {
    return this.callService.hangup(dto.channelId);
  }

  @Post('transfer')
  transfer(
    @Body() body: { channelId: string; target: string; type?: 'blind' | 'attended' },
  ) {
    return this.callService.transfer(body.channelId, body.target, body.type);
  }

  @Get('trace/:id')
  getTrace(@Param('id') id: string) {
    return this.callService.getCallTrace(id);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(TELEPHONY_PATTERNS.GET_CALL_LOGS)
  handleGetCallLogs(@Payload() filter: CallLogFilterDto) {
    return this.callService.findAll(filter);
  }

  @MessagePattern(TELEPHONY_PATTERNS.GET_CALL_LOG)
  handleGetCallLog(@Payload() data: { id: string }) {
    return this.callService.findOne(data.id);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ORIGINATE_CALL)
  handleOriginate(@Payload() dto: OriginateCallDto) {
    return this.callService.originate(dto);
  }

  @MessagePattern(TELEPHONY_PATTERNS.HANGUP_CALL)
  handleHangup(@Payload() data: { channelId: string }) {
    return this.callService.hangup(data.channelId);
  }

  @MessagePattern(TELEPHONY_PATTERNS.TRANSFER_CALL)
  handleTransfer(@Payload() data: { channelId: string; target: string; type?: 'blind' | 'attended' }) {
    return this.callService.transfer(data.channelId, data.target, data.type);
  }

  @MessagePattern(TELEPHONY_PATTERNS.GET_CALL_TRACE)
  handleGetCallTrace(@Payload() data: { id: string }) {
    return this.callService.getCallTrace(data.id);
  }

  @MessagePattern(TELEPHONY_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'telephony-service' };
  }
}
