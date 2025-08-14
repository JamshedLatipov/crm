import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AriService } from './ari.service';

@ApiTags('ARI')
@Controller('ari')
export class AriController {
  constructor(private readonly ari: AriService) {}

  @Get('health')
  @ApiOperation({ summary: 'ARI connection health' })
  @ApiOkResponse({ description: 'Connection status', schema: { properties: { connected: { type: 'boolean' } } } })
  health() { return { connected: this.ari.isConnected() }; }
}
