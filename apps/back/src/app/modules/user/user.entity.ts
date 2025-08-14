import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { PsEndpoint } from '../calls/entities/ps-endpoint.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column('simple-array')
  roles: string[]; // e.g. ['admin', 'manager', 'client']

  @Column({ default: true })
  isActive: boolean;

  // SIP endpoint linkage (optional)
  @Column({ name: 'sip_endpoint_id', length: 40, nullable: true })
  sipEndpointId?: string | null;

  @OneToOne(() => PsEndpoint, { nullable: true })
  @JoinColumn({ name: 'sip_endpoint_id', referencedColumnName: 'id' })
  sipEndpoint?: PsEndpoint | null;
}
