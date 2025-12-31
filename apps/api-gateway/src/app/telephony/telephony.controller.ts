import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  SERVICES,
  TELEPHONY_PATTERNS,
  CallLogFilterDto,
  UpdateCallLogDto,
  OriginateCallDto,
  HangupCallDto,
  AddToQueueDto,
  RemoveFromQueueDto,
  PauseMemberDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

const TELEPHONY_SERVICE = 'TELEPHONY_SERVICE';

@Controller('telephony')
@UseGuards(AuthGuard)
export class TelephonyController {
  constructor(
    @Inject(TELEPHONY_SERVICE) private readonly telephonyClient: ClientProxy,
  ) {}

  // ============ Calls ============

  @Get('calls')
  async getCalls(@Query() filter: CallLogFilterDto) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.GET_CALL_LOGS, filter).pipe(timeout(5000)),
    );
  }

  @Get('calls/:id')
  async getCall(@Param('id') id: string) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.GET_CALL_LOG, { id }).pipe(timeout(5000)),
    );
  }

  @Post('calls/originate')
  async originate(@Body() dto: OriginateCallDto) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.ORIGINATE_CALL, dto).pipe(timeout(10000)),
    );
  }

  @Post('calls/hangup')
  async hangup(@Body() dto: HangupCallDto) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.HANGUP_CALL, dto).pipe(timeout(5000)),
    );
  }

  // ============ Queues ============

  @Get('queues')
  async getQueues() {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.GET_QUEUES, {}).pipe(timeout(5000)),
    );
  }

  @Get('queues/:name')
  async getQueue(@Param('name') name: string) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.GET_QUEUE, { name }).pipe(timeout(5000)),
    );
  }

  @Post('queues/add-member')
  async addToQueue(@Body() dto: AddToQueueDto) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.ADD_TO_QUEUE, dto).pipe(timeout(5000)),
    );
  }

  @Post('queues/remove-member')
  async removeFromQueue(@Body() dto: RemoveFromQueueDto) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.REMOVE_FROM_QUEUE, dto).pipe(timeout(5000)),
    );
  }

  @Post('queues/pause-member')
  async pauseMember(@Body() dto: PauseMemberDto) {
    return firstValueFrom(
      this.telephonyClient.send(TELEPHONY_PATTERNS.PAUSE_MEMBER, dto).pipe(timeout(5000)),
    );
  }
}
