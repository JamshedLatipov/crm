import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CdrService, CdrFilterDto } from './cdr.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('cdr')
export class CdrController {
  constructor(private readonly cdrService: CdrService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: CdrFilterDto) {
    return this.cdrService.findAll(filter);
  }

  @Get('by-src/:src')
  findBySrc(@Param('src') src: string) {
    return this.cdrService.findBySrc(src);
  }

  @Get('by-dst/:dst')
  findByDst(@Param('dst') dst: string) {
    return this.cdrService.findByDst(dst);
  }

  @Get('by-disposition/:disp')
  findByDisposition(@Param('disp') disp: string) {
    return this.cdrService.findByDisposition(disp);
  }

  @Get('unique/:uniqueId')
  findByUniqueId(@Param('uniqueId') uniqueId: string) {
    return this.cdrService.findByUniqueId(uniqueId);
  }

  @Get('channel-uniqueid')
  getChannelUniqueId(@Query('callerNumber') callerNumber: string) {
    return this.cdrService.getChannelUniqueId(callerNumber);
  }

  @Post('log')
  createLog(@Body() body: { src?: string; dst?: string; uniqueId?: string; disposition?: string; duration?: number; note?: string }) {
    return this.cdrService.createLog(body);
  }

  @Get('logs')
  getLogs(@Query() filter: CdrFilterDto) {
    return this.cdrService.getLogs(filter);
  }

  @Get('logs/:id')
  getLog(@Param('id') id: string) {
    return this.cdrService.getLog(id);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_ALL)
  handleGetAll(@Payload() filter: CdrFilterDto) {
    return this.cdrService.findAll(filter);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_BY_SRC)
  handleGetBySrc(@Payload() data: { src: string }) {
    return this.cdrService.findBySrc(data.src);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_BY_DST)
  handleGetByDst(@Payload() data: { dst: string }) {
    return this.cdrService.findByDst(data.dst);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_BY_DISPOSITION)
  handleGetByDisposition(@Payload() data: { disposition: string }) {
    return this.cdrService.findByDisposition(data.disposition);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_BY_UNIQUEID)
  handleGetByUniqueId(@Payload() data: { uniqueId: string }) {
    return this.cdrService.findByUniqueId(data.uniqueId);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_CHANNEL_UNIQUEID)
  handleGetChannelUniqueId(@Payload() data: { callerNumber: string }) {
    return this.cdrService.getChannelUniqueId(data.callerNumber);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_CREATE_LOG)
  handleCreateLog(@Payload() data: { src?: string; dst?: string; uniqueId?: string; disposition?: string; duration?: number; note?: string }) {
    return this.cdrService.createLog(data);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_LOGS)
  handleGetLogs(@Payload() filter: CdrFilterDto) {
    return this.cdrService.getLogs(filter);
  }

  @MessagePattern(TELEPHONY_PATTERNS.CDR_GET_LOG)
  handleGetLog(@Payload() data: { id: string }) {
    return this.cdrService.getLog(data.id);
  }
}
