import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWebRtcOperator31691337601003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // AOR for operator3 (WebRTC)
    await queryRunner.query(`
      INSERT INTO ps_aors (id, max_contacts, remove_existing)
      VALUES ('operator3', 1, 'yes')
      ON CONFLICT (id) DO UPDATE
      SET max_contacts = 1, remove_existing = 'yes';
    `);

    // Auth for operator3
    await queryRunner.query(`
      INSERT INTO ps_auths (id, auth_type, username, password)
      VALUES ('operator3', 'userpass', 'operator3', '123')
      ON CONFLICT (id) DO UPDATE
      SET auth_type = 'userpass', username = 'operator3', password = '123';
    `);

    // Endpoint for operator3 (WebRTC)
    await queryRunner.query(`
      INSERT INTO ps_endpoints (
        id, transport, aors, auth, context, disallow, allow,
        direct_media, dtmf_mode, ice_support, media_encryption,
        rewrite_contact, webrtc, force_rport, rtp_symmetric
      )
      VALUES (
        'operator3', 'transport-wss', 'operator3', 'operator3', 'default', 'all', 'opus,ulaw',
        'no', 'rfc4733', 'yes', 'dtls',
        'yes', 'yes', 'yes', 'yes'
      )
      ON CONFLICT (id) DO UPDATE
      SET
        transport = 'transport-wss',
        aors = 'operator3',
        auth = 'operator3',
        context = 'default',
        disallow = 'all',
        allow = 'opus,ulaw',
        direct_media = 'no',
        dtmf_mode = 'rfc4733',
        ice_support = 'yes',
        media_encryption = 'dtls',
        rewrite_contact = 'yes',
        webrtc = 'yes',
        force_rport = 'yes',
        rtp_symmetric = 'yes';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM ps_endpoints WHERE id = 'operator3';`);
    await queryRunner.query(`DELETE FROM ps_auths WHERE id = 'operator3';`);
    await queryRunner.query(`DELETE FROM ps_aors WHERE id = 'operator3';`);
  }
}