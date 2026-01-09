import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePjsipRecords1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[migration] EnsurePjsipRecords up starting');

    // Ensure MicroSIP
    await queryRunner.query(`
      INSERT INTO ps_aors (id, max_contacts, remove_existing)
      VALUES ('microsip', 5, 'yes')
      ON CONFLICT (id) DO UPDATE SET max_contacts = EXCLUDED.max_contacts, remove_existing = EXCLUDED.remove_existing;
    `);
    await queryRunner.query(`
      INSERT INTO ps_auths (id, auth_type, username, password)
      VALUES ('microsip', 'userpass', 'microsip', 'password123')
      ON CONFLICT (id) DO UPDATE SET auth_type = EXCLUDED.auth_type, username = EXCLUDED.username, password = EXCLUDED.password;
    `);
    await queryRunner.query(`
      INSERT INTO ps_endpoints (id, transport, aors, auth, context, disallow, allow, direct_media, dtmf_mode, ice_support, media_encryption, rewrite_contact, webrtc, force_rport, rtp_symmetric)
      VALUES ('microsip', 'transport-udp', 'microsip', 'microsip', 'default', 'all', 'alaw,ulaw', 'no', 'rfc4733', 'yes', 'no', 'yes', 'no', 'yes', 'yes')
      ON CONFLICT (id) DO UPDATE SET transport = EXCLUDED.transport, aors = EXCLUDED.aors, auth = EXCLUDED.auth, context = EXCLUDED.context, disallow = EXCLUDED.disallow, allow = EXCLUDED.allow, direct_media = EXCLUDED.direct_media, dtmf_mode = EXCLUDED.dtmf_mode, ice_support = EXCLUDED.ice_support, media_encryption = EXCLUDED.media_encryption, rewrite_contact = EXCLUDED.rewrite_contact, webrtc = EXCLUDED.webrtc, force_rport = EXCLUDED.force_rport, rtp_symmetric = EXCLUDED.rtp_symmetric;
    `);

    // Ensure operators 1-4 (WebRTC)
    const operators = [
      { id: 'operator1', transport: 'transport-wss', allow: 'alaw,ulaw', webrtc: 'yes' },
      { id: 'operator2', transport: 'transport-wss', allow: 'alaw,ulaw', webrtc: 'yes' },
      { id: 'operator3', transport: 'transport-wss', allow: 'alaw,ulaw,slin', webrtc: 'yes' },
      { id: 'operator4', transport: 'transport-wss', allow: 'alaw,ulaw,slin', webrtc: 'yes' },
    ];

    for (const op of operators) {
      await queryRunner.query(`
        INSERT INTO ps_aors (id, max_contacts, remove_existing)
        VALUES ($1, 1, 'yes')
        ON CONFLICT (id) DO UPDATE SET max_contacts = 1, remove_existing = 'yes';
      `, [op.id]);

      await queryRunner.query(`
        INSERT INTO ps_auths (id, auth_type, username, password)
        VALUES ($1, 'userpass', $1, '123')
        ON CONFLICT (id) DO UPDATE SET auth_type = EXCLUDED.auth_type, username = EXCLUDED.username, password = EXCLUDED.password;
      `, [op.id]);

      await queryRunner.query(`
        INSERT INTO ps_endpoints (id, transport, aors, auth, context, disallow, allow, direct_media, dtmf_mode, ice_support, media_encryption, rewrite_contact, webrtc, force_rport, rtp_symmetric)
        VALUES ($1, $2, $1, $1, 'default', 'all', $3, 'no', 'rfc4733', 'yes', 'dtls', 'yes', $4, 'yes', 'yes')
        ON CONFLICT (id) DO UPDATE SET transport = EXCLUDED.transport, aors = EXCLUDED.aors, auth = EXCLUDED.auth, context = EXCLUDED.context, disallow = EXCLUDED.disallow, allow = EXCLUDED.allow, direct_media = EXCLUDED.direct_media, dtmf_mode = EXCLUDED.dtmf_mode, ice_support = EXCLUDED.ice_support, media_encryption = EXCLUDED.media_encryption, rewrite_contact = EXCLUDED.rewrite_contact, webrtc = EXCLUDED.webrtc, force_rport = EXCLUDED.force_rport, rtp_symmetric = EXCLUDED.rtp_symmetric;
      `, [op.id, op.transport, op.allow, op.webrtc]);
    }

    console.log('[migration] EnsurePjsipRecords up finished');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Do not remove operator records on revert to avoid accidental disruption; no-op.
  }
}
