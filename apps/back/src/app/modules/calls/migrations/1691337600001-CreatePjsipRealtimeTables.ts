import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePjsipRealtimeTables1691337600001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ps_endpoints (
        id VARCHAR(40) PRIMARY KEY,
        transport VARCHAR(40),
        aors VARCHAR(200),
        auth VARCHAR(40),
        context VARCHAR(40),
        disallow VARCHAR(200),
        allow VARCHAR(200),
        direct_media VARCHAR(40),
        connected_line_method VARCHAR(40),
        direct_media_method VARCHAR(40),
        direct_media_glare_mitigation VARCHAR(40),
        disable_direct_media_on_nat VARCHAR(40),
        dtmf_mode VARCHAR(40),
        external_media_address VARCHAR(40),
        force_rport VARCHAR(40),
        ice_support VARCHAR(40),
        identify_by VARCHAR(40),
        mailboxes VARCHAR(40),
        media_address VARCHAR(40),
        media_encryption VARCHAR(40),
        media_encryption_optimistic VARCHAR(40),
        media_use_received_transport VARCHAR(40),
        moh_suggest VARCHAR(40),
        outbound_auth VARCHAR(40),
        outbound_proxy VARCHAR(40),
        rewrite_contact VARCHAR(40),
        rtp_ipv6 VARCHAR(40),
        rtp_symmetric VARCHAR(40),
        send_diversion VARCHAR(40),
        send_pai VARCHAR(40),
        send_rpid VARCHAR(40),
        timers_min_se VARCHAR(40),
        timers VARCHAR(40),
        timers_sess_expires VARCHAR(40),
        callerid VARCHAR(40),
        webrtc VARCHAR(40),
        dtls_verify VARCHAR(40),
        dtls_setup VARCHAR(40),
        dtls_rekey VARCHAR(40),
        dtls_cert_file VARCHAR(200),
        dtls_private_key VARCHAR(200),
        dtls_cipher VARCHAR(200),
        dtls_ca_file VARCHAR(200),
        dtls_ca_path VARCHAR(200),
        dtls_dh_file VARCHAR(200),
        dtls_fingerprint VARCHAR(40),
        dtls_auto_generate_cert VARCHAR(40),
        srtp_tag_32 VARCHAR(40),
        accountcode VARCHAR(40),
        user_eq_phone VARCHAR(40),
        mwi_from_user VARCHAR(40),
        line_label VARCHAR(40),
        device_state_busy_at VARCHAR(40)
      );
      CREATE TABLE IF NOT EXISTS ps_aors (
        id VARCHAR(40) PRIMARY KEY,
        max_contacts INTEGER,
        remove_existing VARCHAR(40),
        minimum_expiration INTEGER,
        maximum_expiration INTEGER,
        default_expiration INTEGER,
        qualify_frequency INTEGER,
        authenticate_qualify VARCHAR(40),
        maximum_qualify_timeout INTEGER,
        contact VARCHAR(200)
      );
      CREATE TABLE IF NOT EXISTS ps_auths (
        id VARCHAR(40) PRIMARY KEY,
        auth_type VARCHAR(40),
        password VARCHAR(80),
        username VARCHAR(40),
        realm VARCHAR(40)
      );
      CREATE TABLE IF NOT EXISTS ps_domain_aliases (
        id VARCHAR(40) PRIMARY KEY,
        domain VARCHAR(40)
      );
      CREATE TABLE IF NOT EXISTS ps_endpoint_id_ips (
        id VARCHAR(40) PRIMARY KEY,
        endpoint VARCHAR(40),
        match VARCHAR(80)
      );
      CREATE TABLE IF NOT EXISTS ps_contacts (
        id VARCHAR(255) PRIMARY KEY,
        uri VARCHAR(255),
        expiration_time BIGINT,
        qualify_frequency INTEGER,
        outbound_proxy VARCHAR(40),
        path VARCHAR(255),
        user_agent VARCHAR(255),
        reg_server VARCHAR(40),
        authenticate_qualify VARCHAR(40),
        via_addr VARCHAR(40),
        via_port INTEGER,
        call_id VARCHAR(255),
        endpoint VARCHAR(40),
        prune_on_boot VARCHAR(40)
      );
      CREATE TABLE IF NOT EXISTS ps_qualify (
        id VARCHAR(40) PRIMARY KEY,
        endpoint VARCHAR(40),
        contact VARCHAR(255),
        qualify_frequency INTEGER,
        timeout INTEGER
      );
      CREATE TABLE IF NOT EXISTS ps_registrations (
        id VARCHAR(40) PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS ps_globals (
        id VARCHAR(40) PRIMARY KEY
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS ps_globals;
      DROP TABLE IF EXISTS ps_registrations;
      DROP TABLE IF EXISTS ps_qualify;
      DROP TABLE IF EXISTS ps_contacts;
      DROP TABLE IF EXISTS ps_endpoint_id_ips;
      DROP TABLE IF EXISTS ps_domain_aliases;
      DROP TABLE IF EXISTS ps_auths;
      DROP TABLE IF EXISTS ps_aors;
      DROP TABLE IF EXISTS ps_endpoints;
    `);
  }
}
