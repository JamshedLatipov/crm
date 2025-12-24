import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CallTraceService } from '../services/call-trace.service';

@ApiTags('Call Trace')
@Controller('calls/trace')
export class CallTraceController {
  constructor(private readonly callTraceService: CallTraceService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get full lifecycle trace of a call' })
  @ApiResponse({ status: 200, description: 'Call trace data' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async getTrace(@Param('id') id: string) {
    const trace = await this.callTraceService.getCallTrace(id);
    if (!trace) {
        throw new NotFoundException(`No trace found for call ID ${id}`);
    }
    return trace;
  }
}
