import { Controller, Post, UseInterceptors, UploadedFile, Get, Delete, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { IvrMediaService } from './ivr-media.service';
import * as path from 'path';

@Controller('ivr/media')
export class IvrMediaController {
  constructor(private svc: IvrMediaService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: process.env.IVR_MEDIA_DIR || path.resolve(process.cwd(),'data','asterisk','sounds','custom'),
      filename: (req, file, cb) => {
  const safe = (file.originalname || 'file').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9-_.]/g,'');
        cb(null, Date.now() + '_' + safe);
      }
    }),
    limits: { fileSize: 8 * 1024 * 1024 }
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async upload(@UploadedFile() file: any) {
    return this.svc.registerFile(file);
  }

  @Delete(':id')
  async del(@Param('id') id: string){ await this.svc.remove(id); return { ok: true }; }
}
