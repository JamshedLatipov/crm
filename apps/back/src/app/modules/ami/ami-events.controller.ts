import { Controller, Get, Query, Param } from '@nestjs/common';
import { AriEventStoreService } from '../ari/ari-event-store.service';

@Controller('ami/events')
export class AmiEventsController {
  constructor(private readonly store: AriEventStoreService) {}

  /**
   * GET /api/ami/events/recent?limit=100
   */
  @Get('recent')
  async recent(@Query('limit') limit?: string) {
    const l = limit ? Number(limit) : 200;
    const rows = await this.store.recent(l);
    return { success: true, count: rows.length, data: rows };
  }

  /**
   * GET /api/ami/events/search?event=AMI:Hangup&limit=100
   * Simple search by event name prefix
   */
  @Get('search')
  async search(@Query('event') event?: string, @Query('limit') limit?: string) {
    const l = limit ? Number(limit) : 200;
    const rows = await this.store.recent(l);
    if (!event) return { success: true, count: rows.length, data: rows };
    const filtered = rows.filter((r) => String(r.event || '').includes(String(event)));
    return { success: true, count: filtered.length, data: filtered };
  }

  /**
   * GET /api/ami/events/channel/:id
   * Return recent events where channelId equals :id
   */
  @Get('channel/:id')
  async byChannel(@Param('id') id: string, @Query('limit') limit?: string) {
    const l = limit ? Number(limit) : 500;
    const rows = await this.store.recent(l);
    const filtered = rows.filter((r) => String(r.channelId || '') === String(id));
    return { success: true, count: filtered.length, data: filtered };
  }
}
