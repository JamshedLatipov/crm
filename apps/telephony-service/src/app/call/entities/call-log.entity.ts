import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('call_logs')
export class CallLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  note: string;

  @Column({ name: 'callType', length: 64, nullable: true })
  callType: string;

  @Column({ name: 'scriptBranch', length: 255, nullable: true })
  scriptBranch: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ length: 64, nullable: true })
  disposition: string;

  @Column({ name: 'clientCallId', length: 255, nullable: true })
  clientCallId: string;

  @Column({ name: 'createdBy', length: 255, nullable: true })
  createdBy: string;

  @Column({ name: 'asteriskUniqueId', length: 64, nullable: true, unique: true })
  asteriskUniqueId: string;

  @Column({ length: 32, default: 'awaiting_cdr' })
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', nullable: true })
  updatedAt: Date;
}
