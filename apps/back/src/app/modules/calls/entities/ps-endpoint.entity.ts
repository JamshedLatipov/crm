import { Entity, Column, PrimaryColumn } from 'typeorm';

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
  connected_line_method: string;

  @Column({ length: 40, nullable: true })
  direct_media_method: string;

  @Column({ length: 40, nullable: true })
  direct_media_glare_mitigation: string;

  @Column({ length: 40, nullable: true })
  disable_direct_media_on_nat: string;

  @Column({ length: 40, nullable: true })
  dtmf_mode: string;

  @Column({ length: 40, nullable: true })
  external_media_address: string;

  @Column({ length: 40, nullable: true })
  force_rport: string;

  @Column({ length: 40, nullable: true })
  ice_support: string;

  @Column({ length: 40, nullable: true })
  identify_by: string;

  @Column({ length: 40, nullable: true })
  mailboxes: string;

  @Column({ length: 40, nullable: true })
  media_address: string;

  @Column({ length: 40, nullable: true })
  media_encryption: string;

  @Column({ length: 40, nullable: true })
  media_encryption_optimistic: string;

  @Column({ length: 40, nullable: true })
  media_use_received_transport: string;

  @Column({ length: 40, nullable: true })
  moh_suggest: string;

  @Column({ length: 40, nullable: true })
  outbound_auth: string;

  @Column({ length: 40, nullable: true })
  outbound_proxy: string;

  @Column({ length: 40, nullable: true })
  rewrite_contact: string;

  @Column({ length: 40, nullable: true })
  rtp_ipv6: string;

  @Column({ length: 40, nullable: true })
  rtp_symmetric: string;

  @Column({ length: 40, nullable: true })
  send_diversion: string;

  @Column({ length: 40, nullable: true })
  send_pai: string;

  @Column({ length: 40, nullable: true })
  send_rpid: string;

  @Column({ length: 40, nullable: true })
  timers_min_se: string;

  @Column({ length: 40, nullable: true })
  timers: string;

  @Column({ length: 40, nullable: true })
  timers_sess_expires: string;

  @Column({ length: 40, nullable: true })
  callerid: string;

  @Column({ length: 40, nullable: true })
  webrtc: string;

  @Column({ length: 40, nullable: true })
  dtls_verify: string;

  @Column({ length: 40, nullable: true })
  dtls_setup: string;

  @Column({ length: 40, nullable: true })
  dtls_rekey: string;

  @Column({ length: 200, nullable: true })
  dtls_cert_file: string;

  @Column({ length: 200, nullable: true })
  dtls_private_key: string;

  @Column({ length: 200, nullable: true })
  dtls_cipher: string;

  @Column({ length: 200, nullable: true })
  dtls_ca_file: string;

  @Column({ length: 200, nullable: true })
  dtls_ca_path: string;

  @Column({ length: 200, nullable: true })
  dtls_dh_file: string;

  @Column({ length: 40, nullable: true })
  dtls_fingerprint: string;

  @Column({ length: 40, nullable: true })
  dtls_auto_generate_cert: string;

  @Column({ length: 40, nullable: true })
  srtp_tag_32: string;

  @Column({ length: 40, nullable: true })
  accountcode: string;

  @Column({ length: 40, nullable: true })
  user_eq_phone: string;

  @Column({ length: 40, nullable: true })
  mwi_from_user: string;

  @Column({ length: 40, nullable: true })
  line_label: string;

  @Column({ length: 40, nullable: true })
  device_state_busy_at: string;
}
