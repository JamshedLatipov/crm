import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Response } from 'express';
import { RecordingsService } from './recordings.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get()
  @MessagePattern(TELEPHONY_PATTERNS.RECORDING_LIST)
  async listRecordings(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.recordingsService.listRecordings(
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0
    );
  }

  @Get(':uniqueid')
  async getRecording(
    @Param('uniqueid') uniqueid: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const { stream, contentType, filename } = this.recordingsService.getRecordingStream(uniqueid);
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }

  @Get(':uniqueid/info')
  @MessagePattern(TELEPHONY_PATTERNS.RECORDING_GET_INFO)
  async getRecordingInfo(@Param('uniqueid') uniqueid: string) {
    return this.recordingsService.getRecordingInfo(uniqueid);
  }

  @Get(':uniqueid/exists')
  @MessagePattern(TELEPHONY_PATTERNS.RECORDING_EXISTS)
  async checkRecording(@Param('uniqueid') uniqueid: string) {
    return this.recordingsService.checkRecording(uniqueid);
  }
}
