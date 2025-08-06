import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ps_domain_aliases')
export class PsDomainAlias {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 40, nullable: true })
  domain: string;
}
