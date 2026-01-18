import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StoOrderZone } from '../enums';

@Entity('qr_codes')
export class QrCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: StoOrderZone })
  zone: StoOrderZone;

  @Column({ nullable: true })
  displayId: string; // Привязка к конкретному табло (опционально)

  @Column({ unique: true })
  token: string; // UUID для URL

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  qrImageUrl: string; // Путь к сгенерированному изображению

  @Column({ nullable: true })
  createdBy: string; // Admin user ID

  @Column({ type: 'int', default: 0 })
  usageCount: number; // Счётчик использований

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  getPublicUrl(baseUrl: string): string {
    return `${baseUrl}/queue/join?token=${this.token}`;
  }
}
