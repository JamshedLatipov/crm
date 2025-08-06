import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ps_endpoint_id_ips')
export class PsEndpointIdIp {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 40, nullable: true })
  endpoint: string;

  @Column({ length: 80, nullable: true })
  match: string;
}
