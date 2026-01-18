import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QrCode, StoOrderZone } from '@libs/shared/sto-types';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QrCodeService {
  constructor(
    @InjectRepository(QrCode)
    private qrCodeRepository: Repository<QrCode>,
  ) {}

  async generate(
    zone: StoOrderZone,
    displayId: string | null,
    ttlHours: number,
    createdBy: string,
  ): Promise<QrCode> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const qrCode = this.qrCodeRepository.create({
      zone,
      displayId: displayId || undefined,
      token,
      expiresAt,
      createdBy,
    });

    await this.qrCodeRepository.save(qrCode);

    // Generate QR image
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const url = qrCode.getPublicUrl(baseUrl);
    const qrImageDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
    });

    qrCode.qrImageUrl = qrImageDataUrl;
    await this.qrCodeRepository.save(qrCode);

    return qrCode;
  }

  async findAll(): Promise<QrCode[]> {
    return this.qrCodeRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<QrCode | null> {
    return this.qrCodeRepository.findOne({ where: { id } });
  }

  async findByToken(token: string): Promise<QrCode | null> {
    return this.qrCodeRepository.findOne({ where: { token } });
  }

  async incrementUsage(id: string): Promise<void> {
    await this.qrCodeRepository.increment({ id }, 'usageCount', 1);
    await this.qrCodeRepository.update(id, { lastUsedAt: new Date() });
  }

  async deactivate(id: string): Promise<void> {
    await this.qrCodeRepository.update(id, { isActive: false });
  }
}
