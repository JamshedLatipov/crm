import { Entity, Column, PrimaryColumn, OneToOne } from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('ps_endpoints')
export class PsEndpoint {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 40, nullable: true })
  transport: string;

  @Column({ length: 200, nullable: true })
  aors: string;

  @Column({ length: 40, nullable: true })
  auth: string;

  @Column({ length: 40, nullable: true })
  context: string;

  @Column({ length: 200, nullable: true })
  disallow: string;

  @Column({ length: 200, nullable: true })
  allow: string;

  @Column({ length: 40, nullable: true })
  direct_media: string;

  @Column({ length: 40, nullable: true })
  dtmf_mode: string;

  @Column({ length: 40, nullable: true })
  ice_support: string;

  @Column({ length: 40, nullable: true })
  mailboxes: string;

  @Column({ length: 40, nullable: true })
  media_encryption: string;

  @Column({ length: 40, nullable: true })
  rewrite_contact: string;

  @Column({ length: 40, nullable: true })
  callerid: string;

  @Column({ length: 40, nullable: true })
  webrtc: string;

  @Column({ length: 40, nullable: true })
  dtls_verify: string;
  
  @Column({ length: 40, nullable: true })
  dtls_setup: string;
  
  @Column({ length: 40, nullable: true })
  force_rport: string;
  
  @Column({ length: 40, nullable: true })
  rtp_symmetric: string;

  @OneToOne(() => User, user => user.sipEndpoint, { nullable: true })
  user?: User | null;
}
