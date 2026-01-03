import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('call_summaries')
export class CallSummary {
  @PrimaryColumn({ length: 64 })
  uniqueId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  cdrId: string;

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

  // Call metrics
  @Column({ type: 'int', nullable: true })
  talkTime: number; // billsec from CDR

  @Column({ type: 'int', nullable: true })
  ringTime: number; // time between ENTERQUEUE and CONNECT

  @Column({ type: 'int', nullable: true })
  abandonTime: number; // time before abandon

  // Call routing
  @Column({ length: 32, nullable: true, default: 'inbound' })
  direction: string; // inbound/outbound/internal

  @Column({ length: 64, nullable: true })
  entryPoint: string; // DID/trunk

  @Column({ type: 'int', nullable: true, default: 0 })
  ringCount: number; // number of agents ringed

  // Business context
  @Index()
  @Column({ type: 'int', nullable: true })
  leadId: number;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  dealId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  contactId: string;

  @Column({ type: 'text', nullable: true })
  recordingUrl: string;

  @Column({ type: 'text', nullable: true })
  tags: string; // JSON array

  // Quality metrics
  @Column({ type: 'boolean', nullable: true, default: false })
  slaViolated: boolean;

  @Column({ type: 'int', nullable: true })
  firstResponseTime: number; // seconds to first IVR/agent response

  @Column({ type: 'varchar', length: 64, nullable: true })
  disconnectReason: string; // from CDR disposition + hangup cause
}
