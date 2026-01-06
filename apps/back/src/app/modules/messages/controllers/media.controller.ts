import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
  ParseFilePipeBuilder,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { MediaService } from '../services/media.service';
import { Public } from '../decorators/public.decorator';

const UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR || path.resolve(process.cwd(), 'data', 'messages', 'media');

// Создаём директорию если её нет
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('Media')
@Controller('messages/media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Загрузить медиафайл' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Файл успешно загружен' })
  @ApiResponse({ status: 400, description: 'Некорректный файл' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
          // Генерируем уникальное имя файла
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const safeName = file.originalname
            .replace(ext, '')
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 50);
          cb(null, `${safeName}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 16 * 1024 * 1024, // 16MB - лимит WhatsApp для видео
      },
    })
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 16 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        })
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    // Валидация типа файла для WhatsApp/Telegram
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Video
      'video/mp4',
      'video/3gpp',
      'video/quicktime',
      // Audio
      'audio/aac',
      'audio/mp4',
      'audio/mpeg',
      'audio/amr',
      'audio/ogg',
      'audio/wav',
      'audio/x-m4a',
      // Documents
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Удаляем загруженный файл
      fs.unlinkSync(file.path);
      throw new BadRequestException(
        `Неподдерживаемый тип файла: ${file.mimetype}. Разрешены: изображения (JPEG, PNG, GIF, WebP), видео (MP4, 3GPP), аудио (MP3, OGG, AAC), документы (PDF, DOC, DOCX)`
      );
    }

    const userId = req.user?.sub || req.user?.id;
    const media = await this.mediaService.create({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: userId,
    });

    return media;
  }

  @Get()
  @ApiOperation({ summary: 'Получить список загруженных файлов' })
  @ApiResponse({ status: 200, description: 'Список файлов' })
  async findAll(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.mediaService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о файле' })
  @ApiResponse({ status: 200, description: 'Информация о файле' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async findOne(@Param('id') id: string) {
    const media = await this.mediaService.findOne(id);
    if (!media) {
      throw new NotFoundException('Файл не найден');
    }
    return media;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить файл' })
  @ApiResponse({ status: 200, description: 'Файл удалён' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    await this.mediaService.remove(id, userId);
    return { message: 'Файл успешно удалён' };
  }

  @Public()
  @Get('files/:filename')
  @ApiOperation({ summary: 'Получить файл по имени' })
  @ApiResponse({ status: 200, description: 'Файл' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async serveFile(@Param('filename') filename: string, @Res({ passthrough: true }) res: Response) {
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Файл не найден');
    }

    const file = fs.createReadStream(filePath);
    const stat = fs.statSync(filePath);

    // Определяем MIME type по расширению
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.3gp': 'video/3gpp',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
      '.m4a': 'audio/x-m4a',
      '.wav': 'audio/wav',
      '.txt': 'text/plain',
    };

    res.set({
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(file);
  }
}
