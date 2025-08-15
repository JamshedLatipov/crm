import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrMedia } from './entities/ivr-media.entity';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

@Injectable()
export class IvrMediaService {
  private readonly logger = new Logger(IvrMediaService.name);
  private mediaDir = process.env.IVR_MEDIA_DIR || path.resolve(process.cwd(), 'data', 'asterisk', 'sounds', 'custom');

  constructor(@InjectRepository(IvrMedia) private repo: Repository<IvrMedia>) {
    try { fs.mkdirSync(this.mediaDir, { recursive: true }); } catch (e) { this.logger.debug('mkdir mediaDir: '+(e as Error).message); }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async registerFile(file: any) {
    const record = this.repo.create({ name: (file.originalname || file.filename).replace(/\.[^.]+$/, ''), filename: file.filename, size: file.size });
    const saved = await this.repo.save(record);

    // attempt conversion to Asterisk-friendly formats (.gsm and 8k mono .wav)
    const input = path.join(this.mediaDir, file.filename);
    const base = file.filename.replace(/\.[^.]+$/, '');
    const outGsm = path.join(this.mediaDir, base + '.gsm');
    const outWav = path.join(this.mediaDir, base + '.wav');

    // determine ffmpeg binary: env override, ffmpeg-static package, node_modules/.bin, or plain 'ffmpeg'
    let ffmpegBin: string | undefined = process.env.FFMPEG_PATH;
    try {
      const ff = require('ffmpeg-static');
      if (ff) ffmpegBin = ff;
    } catch (e) {
      this.logger.debug('ffmpeg-static not resolved: '+((e as Error).message || ''));
    }

    // try node_modules/.bin fallback (useful for local installs on Windows where bin is .cmd)
    if (!ffmpegBin) {
      const candDir = path.join(process.cwd(), 'node_modules', '.bin');
      const candidates = ['ffmpeg', 'ffmpeg.cmd', 'ffmpeg.exe'];
      for (const c of candidates) {
        const p = path.join(candDir, c);
        try {
          if (fs.existsSync(p)) { ffmpegBin = p; this.logger.debug('Found ffmpeg in .bin: '+p); break; }
        } catch (e) { this.logger.debug('check .bin candidate failed: '+((e as Error).message||'')); }
      }
    }

    // common Windows install locations
    if (!ffmpegBin && process.platform === 'win32') {
      const winCandidates = [
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\ffmpeg\\bin\\ffmpeg.exe'
      ];
      for (const p of winCandidates) {
        try {
          if (fs.existsSync(p)) { ffmpegBin = p; this.logger.debug('Found ffmpeg in Windows path: '+p); break; }
        } catch (e) { this.logger.debug('check windows candidate failed: '+((e as Error).message||'')); }
      }
    }

    if (!ffmpegBin) ffmpegBin = 'ffmpeg';

    const run = (args: string[]) => new Promise<void>((resolve) => {
      try {
        const p = spawn(ffmpegBin as string, args, { stdio: 'ignore' });
        p.on('close', (code) => {
          if (code === 0) this.logger.log(`ffmpeg success ${args.join(' ')}`);
          else this.logger.warn(`ffmpeg exit ${code} ${args.join(' ')}`);
          resolve();
        });
        p.on('error', (err) => { this.logger.warn(`ffmpeg spawn failed (${ffmpegBin}): `+(err as Error).message); resolve(); });
      } catch (e) { this.logger.debug('ffmpeg run exception: '+(e as Error).message); resolve(); }
    });

    // Only run conversion if input exists
    try {
      if (fs.existsSync(input)) {
        // create gsm (narrowband 8k mono)
        await run(['-y','-i', input, '-ar','8000','-ac','1','-ab','12k', outGsm]);
        // create 8k mono wav (PCM 16-bit) — Asterisk can use .wav
        await run(['-y','-i', input, '-ar','8000','-ac','1','-acodec','pcm_s16le', outWav]);
      } else {
        this.logger.warn('Uploaded file missing for conversion: '+input);
      }
    } catch (e) {
      this.logger.warn('Conversion failed: '+(e as Error).message);
    }

    return saved;
  }

  async list() { return this.repo.find({ order: { createdAt: 'DESC' } }); }

  async remove(id: string) {
    const r = await this.repo.findOne({ where: { id } });
    if(!r) return;
    try { await fs.promises.unlink(path.join(this.mediaDir, r.filename)); } catch (e) { this.logger.debug('unlink: '+(e as Error).message); }
    await this.repo.delete(id);
  }
}
