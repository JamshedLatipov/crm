import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'call_logs' })
@Index('IDX_call_logs_asteriskUniqueId', ['asteriskUniqueId'], { 
  unique: true,
  where: '"asteriskUniqueId" IS NOT NULL'
})
export class CallLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientCallId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  asteriskUniqueId: string | null;

  @Column({ type: 'varchar', length: 32, nullable: false, default: 'awaiting_cdr' })
  status: string;

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

  @Column({ type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}
