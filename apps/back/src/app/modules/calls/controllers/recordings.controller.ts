import { Controller, Get, Param, Res, NotFoundException, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

@ApiTags('Recordings')
@Controller('api/calls/recordings')
export class RecordingsController {
  private readonly recordingsPath = process.env.RECORDINGS_PATH || '/var/lib/asterisk/recordings';

  @Get(':uniqueId')
  @ApiOperation({ summary: 'Download call recording by uniqueId' })
  @ApiParam({ name: 'uniqueId', description: 'Asterisk uniqueId (e.g., 1735307123.45)' })
  @ApiResponse({ status: 200, description: 'WAV audio file', type: StreamableFile })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async getRecording(
    @Param('uniqueId') uniqueId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Sanitize uniqueId to prevent path traversal
    const sanitized = uniqueId.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = join(this.recordingsPath, `${sanitized}.wav`);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Recording for call ${uniqueId} not found`);
    }

    const stats = statSync(filePath);
    const stream = createReadStream(filePath);

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename="${sanitized}.wav"`,
    });

    return new StreamableFile(stream);
  }

  @Get('exists/:uniqueId')
  @ApiOperation({ summary: 'Check if recording exists' })
  @ApiParam({ name: 'uniqueId', description: 'Asterisk uniqueId' })
  @ApiResponse({ status: 200, description: 'Returns { exists: boolean, size?: number }' })
  checkRecordingExists(@Param('uniqueId') uniqueId: string) {
    const sanitized = uniqueId.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = join(this.recordingsPath, `${sanitized}.wav`);

    if (!existsSync(filePath)) {
      return { exists: false };
    }

    const stats = statSync(filePath);
    return {
      exists: true,
      size: stats.size,
      path: `/api/calls/recordings/${sanitized}`,
    };
  }
}
