import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ps_qualify')
export class PsQualify {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 40, nullable: true })
  endpoint: string;

  @Column({ length: 255, nullable: true })
  contact: string;

  @Column({ type: 'int', nullable: true })
  qualify_frequency: number;

  @Column({ type: 'int', nullable: true })
  timeout: number;
}
