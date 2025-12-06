import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { IvrService, CreateIvrNodeDto, UpdateIvrNodeDto } from './ivr.service';
import { IvrRuntimeService } from './ivr-runtime.service';
import { IvrLogService } from './ivr-log.service';

@Controller('ivr')
export class IvrController {
  constructor(
    private readonly svc: IvrService,
    private readonly runtime: IvrRuntimeService,
    private readonly logSvc: IvrLogService,
  ) {}

  @Post('nodes')
  create(@Body() dto: CreateIvrNodeDto) { return this.svc.create(dto); }

  @Get('nodes/root')
  roots() { return this.svc.findRootTree(); }

  @Get('nodes/:id')
  node(@Param('id') id: string) { return this.svc.getSubtree(id); }

  @Get('nodes/:id/children')
  children(@Param('id') id: string) { return this.svc.findChildren(id); }

  @Put('nodes/:id')
  update(@Param('id') id: string, @Body() dto: UpdateIvrNodeDto) { return this.svc.update(id, dto); }

  @Delete('nodes/:id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Get('runtime/stats')
  async runtimeStats() {
    // Snapshot of active in-memory calls
    const active = this.runtime.getActiveCallsSnapshot();
    // Use logs to compute simple daily metrics
    const since = new Date();
    since.setHours(0,0,0,0);
    const logs = await this.logSvc.getLogsSince(since);
    const started = logs.filter(l => l.event === 'CALL_START').length;
    const ended = logs.filter(l => l.event === 'CALL_END').length;
    const queueEnters = logs.filter(l => l.event === 'QUEUE_ENTER').length;
  const missed = logs.filter(l => (l.event === 'CALL_END' && l.meta && (l.meta as any).reason === 'missed')).length;
    return {
      activeCalls: active.count,
      activeChannelIds: active.channelIds,
      callsStartedToday: started,
      callsEndedToday: ended,
      queueEntersToday: queueEnters,
      missedCallsToday: missed,
    };
  }

  @Get('logs')
  async logs(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.logSvc.getLogsSince(sinceDate);
  }
}
