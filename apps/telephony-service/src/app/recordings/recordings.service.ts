import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { existsSync, createReadStream, ReadStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';

export interface RecordingInfo {
  uniqueid: string;
  filename: string;
  path: string;
  size: number;
  extension: string;
  createdAt: Date;
  url: string;
}

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);
  private readonly recordingsPath: string;

  constructor() {
    const envPath = process.env['RECORDINGS_PATH'];
    
    if (envPath && existsSync(envPath)) {
      this.recordingsPath = envPath;
    } else {
      this.recordingsPath = resolve(process.cwd(), 'data', 'asterisk', 'recordings');
    }
    
    this.logger.log(`Using recordings path: ${this.recordingsPath}`);
  }

  findRecordingPath(uniqueid: string): string | null {
    const sanitized = uniqueid.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const extensions = ['.wav', '.mp3', '.gsm'];

    for (const ext of extensions) {
      const testPath = join(this.recordingsPath, `${sanitized}${ext}`);
      if (existsSync(testPath)) {
        return testPath;
      }
    }
    return null;
  }

  getRecordingStream(uniqueid: string): { stream: ReadStream; contentType: string; filename: string } {
    const filePath = this.findRecordingPath(uniqueid);
    if (!filePath) {
      throw new NotFoundException(`Recording not found for call ${uniqueid}`);
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || 'wav';
    const contentType = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'gsm': 'audio/x-gsm',
    }[ext] || 'audio/wav';

    const sanitized = uniqueid.replace(/[^a-zA-Z0-9.\-_]/g, '');
    
    return {
      stream: createReadStream(filePath),
      contentType,
      filename: `${sanitized}.${ext}`,
    };
  }

  async checkRecording(uniqueid: string): Promise<{ exists: boolean; url?: string }> {
    const filePath = this.findRecordingPath(uniqueid);
    if (filePath) {
      const sanitized = uniqueid.replace(/[^a-zA-Z0-9.\-_]/g, '');
      return { 
        exists: true, 
        url: `/api/recordings/${sanitized}`
      };
    }
    return { exists: false };
  }

  async listRecordings(limit = 100, offset = 0): Promise<{ recordings: RecordingInfo[]; total: number }> {
    if (!existsSync(this.recordingsPath)) {
      return { recordings: [], total: 0 };
    }

    try {
      const files = await readdir(this.recordingsPath);
      const audioFiles = files.filter(f => /\.(wav|mp3|gsm)$/i.test(f));
      
      const recordings: RecordingInfo[] = [];
      for (const file of audioFiles.slice(offset, offset + limit)) {
        const filePath = join(this.recordingsPath, file);
        const fileStat = await stat(filePath);
        const ext = file.split('.').pop() || '';
        const uniqueid = file.replace(/\.(wav|mp3|gsm)$/i, '');
        
        recordings.push({
          uniqueid,
          filename: file,
          path: filePath,
          size: fileStat.size,
          extension: ext,
          createdAt: fileStat.birthtime,
          url: `/api/recordings/${uniqueid}`,
        });
      }

      return { recordings, total: audioFiles.length };
    } catch (err) {
      this.logger.error(`Failed to list recordings: ${(err as Error).message}`);
      return { recordings: [], total: 0 };
    }
  }

  async getRecordingInfo(uniqueid: string): Promise<RecordingInfo | null> {
    const filePath = this.findRecordingPath(uniqueid);
    if (!filePath) return null;

    const fileStat = await stat(filePath);
    const ext = filePath.split('.').pop() || '';
    const filename = filePath.split(/[/\\]/).pop() || '';

    return {
      uniqueid,
      filename,
      path: filePath,
      size: fileStat.size,
      extension: ext,
      createdAt: fileStat.birthtime,
      url: `/api/recordings/${uniqueid}`,
    };
  }
}
