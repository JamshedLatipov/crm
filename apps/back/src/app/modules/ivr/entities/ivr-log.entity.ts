import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type IvrLogEvent =
  | 'CALL_START'
  | 'CALL_END'
  | 'NODE_EXECUTE'
  | 'DTMF'
  | 'PLAYBACK_FINISHED'
  | 'TIMEOUT'
  | 'QUEUE_ENTER'
  | 'QUEUE_LEAVE';

@Entity('ivr_logs')
export class IvrLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 64 })
  channelId!: string;

  @Index()
  @Column({ length: 64, nullable: true })
  caller!: string | null;

  @Index()
  @Column({ nullable: true })
  nodeId?: string | null;

  // Snapshot of node name at event time (denormalized for reporting)
  @Index()
  @Column({ length: 120, nullable: true })
  nodeName?: string | null;

  @Column({ type: 'varchar', length: 40 })
  event!: IvrLogEvent;

  @Column({ type: 'varchar', length: 16, nullable: true })
  digit?: string | null;

  @Column({ type: 'json', nullable: true })
  meta?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
