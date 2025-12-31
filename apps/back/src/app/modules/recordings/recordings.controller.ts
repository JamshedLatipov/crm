import { Controller, Get, Param, Res, StreamableFile, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join, resolve } from 'path';

@Controller('recordings')
export class RecordingsController {
  private readonly logger = new Logger(RecordingsController.name);
  // Path where Asterisk stores recordings
  private readonly recordingsPath: string;

  constructor() {
    // In production (Docker): /var/lib/asterisk/recordings
    // In development: ./data/asterisk/recordings relative to project root
    const envPath = process.env.RECORDINGS_PATH;
    
    if (envPath && existsSync(envPath)) {
      this.recordingsPath = envPath;
    } else {
      // Development fallback: use local data folder
      this.recordingsPath = resolve(process.cwd(), 'data', 'asterisk', 'recordings');
    }
    
    this.logger.log(`Using recordings path: ${this.recordingsPath}`);
    
    if (!existsSync(this.recordingsPath)) {
      this.logger.warn(`WARNING: Recordings path does not exist: ${this.recordingsPath}`);
    }
  }

  @Get(':uniqueid')
  async getRecording(
    @Param('uniqueid') uniqueid: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    // Sanitize uniqueid to prevent path traversal
    const sanitized = uniqueid.replace(/[^a-zA-Z0-9.\-_]/g, '');
    
    // Try different extensions
    const extensions = ['.wav', '.mp3', '.gsm'];
    let filePath: string | null = null;

    for (const ext of extensions) {
      const testPath = join(this.recordingsPath, `${sanitized}${ext}`);
      if (existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    if (!filePath) {
      throw new NotFoundException(`Recording not found for call ${uniqueid}`);
    }

    // Set appropriate content type
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'gsm': 'audio/x-gsm',
    }[ext || 'wav'] || 'audio/wav';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${sanitized}.${ext}"`,
    });

    const file = createReadStream(filePath);
    return new StreamableFile(file);
  }

  @Get(':uniqueid/exists')
  async checkRecording(@Param('uniqueid') uniqueid: string): Promise<{ exists: boolean; url?: string }> {
    const sanitized = uniqueid.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const extensions = ['.wav', '.mp3', '.gsm'];

    for (const ext of extensions) {
      const testPath = join(this.recordingsPath, `${sanitized}${ext}`);
      if (existsSync(testPath)) {
        return { 
          exists: true, 
          url: `/api/recordings/${sanitized}`
        };
      }
    }

    return { exists: false };
  }
}
