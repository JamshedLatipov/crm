import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ps_contacts')
export class PsContact {
  @PrimaryColumn({ length: 255 })
  id: string;

  @Column({ length: 255, nullable: true })
  uri: string;

  @Column({ type: 'bigint', nullable: true })
  expiration_time: string;

  @Column({ type: 'int', nullable: true })
  qualify_frequency: number;

  @Column({ length: 40, nullable: true })
  outbound_proxy: string;

  @Column({ length: 255, nullable: true })
  path: string;

  @Column({ length: 255, nullable: true })
  user_agent: string;

  @Column({ length: 40, nullable: true })
  reg_server: string;

  @Column({ length: 40, nullable: true })
  authenticate_qualify: string;

  @Column({ length: 40, nullable: true })
  via_addr: string;

  @Column({ type: 'int', nullable: true })
  via_port: number;

  @Column({ length: 255, nullable: true })
  call_id: string;

  @Column({ length: 40, nullable: true })
  endpoint: string;

  @Column({ length: 40, nullable: true })
  prune_on_boot: string;
}
