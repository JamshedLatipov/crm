import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../entities/media.entity';
import * as fs from 'fs';

export interface CreateMediaDto {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy?: string;
}

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>
  ) {}

  async create(dto: CreateMediaDto): Promise<Media> {
    // Генерируем публичный URL для доступа к файлу
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/messages/media/files/${dto.filename}`;

    const media = this.mediaRepo.create({
      ...dto,
      url,
    });

    return this.mediaRepo.save(media);
  }

  async findAll(): Promise<Media[]> {
    return this.mediaRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Media[]> {
    return this.mediaRepo.find({
      where: { uploadedBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Media | null> {
    return this.mediaRepo.findOne({ where: { id } });
  }

  async remove(id: string, userId?: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id } });

    if (!media) {
      throw new NotFoundException('Файл не найден');
    }

    // Проверка прав доступа (если передан userId)
    if (userId && media.uploadedBy !== userId) {
      throw new ForbiddenException('Нет доступа к этому файлу');
    }

    // Удаляем физический файл
    try {
      if (fs.existsSync(media.path)) {
        fs.unlinkSync(media.path);
      }
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
    }

    // Удаляем запись из БД
    await this.mediaRepo.remove(media);
  }

  async getFileStats(): Promise<{ totalFiles: number; totalSize: number }> {
    const result = await this.mediaRepo
      .createQueryBuilder('media')
      .select('COUNT(*)', 'totalFiles')
      .addSelect('SUM(media.size)', 'totalSize')
      .getRawOne();

    return {
      totalFiles: parseInt(result.totalFiles) || 0,
      totalSize: parseInt(result.totalSize) || 0,
    };
  }
}
