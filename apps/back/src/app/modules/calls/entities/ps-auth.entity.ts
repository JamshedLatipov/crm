import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ps_auths')
export class PsAuth {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 40, nullable: true })
  auth_type: string;

  @Column({ length: 80, nullable: true })
  password: string;

  @Column({ length: 40, nullable: true })
  username: string;

  @Column({ length: 40, nullable: true })
  realm: string;
}
