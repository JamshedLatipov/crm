import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'call_logs' })
export class CallLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  callId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  callType: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  scriptBranch: string | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  disposition: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
