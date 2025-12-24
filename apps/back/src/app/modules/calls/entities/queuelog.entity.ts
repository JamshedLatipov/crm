import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'queue_log' })
export class QueueLog {
  @PrimaryGeneratedColumn()
  id: number;

  // stored by Asterisk as a short text timestamp; keep nullable to match DEFAULT NULL
  @Column({ type: 'char', length: 32, nullable: true })
  time?: string | null;

  // unique call identifier from Asterisk (if available)
  @Index()
  @Column({ type: 'char', length: 64, nullable: true })
  callid?: string | null;

  @Column({ length: 80 })
  queuename: string;

  @Column({ length: 80 })
  agent: string;

  @Column({ length: 80 })
  event: string;

  @Column({ type: 'text', nullable: true })
  data?: string | null;

  @Column({ type: 'text', nullable: true })
  data1?: string | null;

  @Column({ type: 'text', nullable: true })
  data2?: string | null;

  @Column({ type: 'text', nullable: true })
  data3?: string | null;

  @Column({ type: 'text', nullable: true })
  data4?: string | null;

  @Column({ type: 'text', nullable: true })
  data5?: string | null;
}
