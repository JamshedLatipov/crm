import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ps_aors')
export class PsAor {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ type: 'int', nullable: true })
  max_contacts: number;

  @Column({ length: 40, nullable: true })
  remove_existing: string;

  @Column({ type: 'int', nullable: true })
  minimum_expiration: number;

  @Column({ type: 'int', nullable: true })
  maximum_expiration: number;

  @Column({ type: 'int', nullable: true })
  default_expiration: number;

  @Column({ type: 'int', nullable: true })
  qualify_frequency: number;

  @Column({ length: 40, nullable: true })
  authenticate_qualify: string;

  @Column({ type: 'int', nullable: true })
  maximum_qualify_timeout: number;

  @Column({ length: 200, nullable: true })
  contact: string;
}
