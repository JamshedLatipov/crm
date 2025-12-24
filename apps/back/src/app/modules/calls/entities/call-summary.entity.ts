import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('call_summaries')
export class CallSummary {
  @PrimaryColumn({ length: 64 })
  uniqueId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column({ type: 'int', nullable: true })
  cdrId: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  answeredAt: Date;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ length: 64, nullable: true })
  caller: string;

  @Column({ length: 64, nullable: true })
  destination: string;

  @Column({ length: 32, nullable: true })
  status: string; // ANSWERED, NO ANSWER, ABANDON, etc.

  @Column({ length: 64, nullable: true })
  queue: string;

  @Column({ length: 64, nullable: true })
  agent: string;

  @Column({ type: 'int', nullable: true })
  waitTime: number;

  @Column({ type: 'text', nullable: true })
  ivrPath: string; // JSON or comma-separated list of nodes

  @Column({ type: 'text', nullable: true })
  ignoredAgents: string; // JSON list of agents who didn't answer

  @Column({ type: 'boolean', nullable: true, default: false })
  wasTransferred: boolean;

  @Column({ length: 64, nullable: true })
  transferTarget: string;

  @Column({ length: 32, nullable: true })
  hangupBy: string;
}
