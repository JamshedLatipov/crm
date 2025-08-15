import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CallTransferService } from '../services/call-transfer.service';

@ApiTags('Calls')
@Controller('calls')
export class CallsController {
  constructor(private readonly transferSvc: CallTransferService) {}

  @Post('transfer')
  async doTransfer(@Body() body: { channelId: string; target: string; type?: 'blind' | 'attended' }) {
    if (!body || !body.channelId || !body.target) return { ok: false, error: 'missing params' };
    try {
      if (body.type === 'attended') await this.transferSvc.attendedTransfer(body.channelId, body.target);
      else await this.transferSvc.blindTransfer(body.channelId, body.target);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
