import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ari_events')
export class AriEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 120 })
  event!: string;

  @Index()
  @Column({ length: 64, nullable: true })
  channelId?: string | null;

  @Column({ type: 'json', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  raw?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
