import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Mechanic } from './mechanic.entity';

@Entity('mechanic_sessions')
export class MechanicSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mechanicId: string;

  @ManyToOne(() => Mechanic)
  @JoinColumn({ name: 'mechanicId' })
  mechanic: Mechanic;

  @Column({ unique: true })
  sessionToken: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  deviceInfo: string;

  @CreateDateColumn()
  createdAt: Date;
}
