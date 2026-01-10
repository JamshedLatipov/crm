import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWebRtcOperator41691337601004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[migration] AddWebRtcOperator4 up starting');
    // AOR for operator4 (WebRTC)
    await queryRunner.query(`
      INSERT INTO ps_aors (id, max_contacts, remove_existing)
      VALUES ('operator4', 1, 'yes')
      ON CONFLICT (id) DO UPDATE
      SET max_contacts = 1, remove_existing = 'yes';
    `);
    console.log('[migration] AddWebRtcOperator4 inserted ps_aors');

    // Auth for operator4
    await queryRunner.query(`
      INSERT INTO ps_auths (id, auth_type, username, password)
      VALUES ('operator4', 'userpass', 'operator4', '123')
      ON CONFLICT (id) DO UPDATE
      SET auth_type = 'userpass', username = 'operator4', password = '123';
    `);
    console.log('[migration] AddWebRtcOperator4 inserted ps_auths');

    // Endpoint for operator4 (WebRTC)
    await queryRunner.query(`
      INSERT INTO ps_endpoints (
        id, transport, aors, auth, context, disallow, allow,
        direct_media, dtmf_mode, ice_support, media_encryption,
        rewrite_contact, webrtc, force_rport, rtp_symmetric
      )
      VALUES (
        'operator4', 'transport-wss', 'operator4', 'operator4', 'default', 'all', 'alaw,ulaw,slin',
        'no', 'rfc4733', 'yes', 'dtls',
        'yes', 'yes', 'yes', 'yes'
      )
      ON CONFLICT (id) DO UPDATE
      SET
        transport = 'transport-wss',
        aors = 'operator4',
        auth = 'operator4',
        context = 'default',
        disallow = 'all',
        allow = 'alaw,ulaw,slin',
        direct_media = 'no',
        dtmf_mode = 'rfc4733',
        ice_support = 'yes',
        media_encryption = 'dtls',
        rewrite_contact = 'yes',
        webrtc = 'yes',
        force_rport = 'yes',
        rtp_symmetric = 'yes';
    `);
    console.log('[migration] AddWebRtcOperator4 inserted ps_endpoints');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM ps_endpoints WHERE id = 'operator4';`);
    await queryRunner.query(`DELETE FROM ps_auths WHERE id = 'operator4';`);
    await queryRunner.query(`DELETE FROM ps_aors WHERE id = 'operator4';`);
  }
}