import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMicroSipAccount1691337600004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[migration] AddMicroSipAccount up starting');
    // Добавляем AOR для MicroSIP
    await queryRunner.query(`
      INSERT INTO ps_aors (id, max_contacts, remove_existing) 
      VALUES ('microsip', 5, 'yes')
      ON CONFLICT (id) DO UPDATE 
      SET max_contacts = 5, remove_existing = 'yes';
    `);
    console.log('[migration] AddMicroSipAccount inserted ps_aors');

    // Добавляем Auth для MicroSIP
    await queryRunner.query(`
      INSERT INTO ps_auths (id, auth_type, username, password) 
      VALUES ('microsip', 'userpass', 'microsip', 'password123')
      ON CONFLICT (id) DO UPDATE 
      SET auth_type = 'userpass', username = 'microsip', password = 'password123';
    `);
    console.log('[migration] AddMicroSipAccount inserted ps_auths');

    // Добавляем Endpoint для MicroSIP
    await queryRunner.query(`
      INSERT INTO ps_endpoints (
        id, transport, aors, auth, context, disallow, allow, 
        direct_media, dtmf_mode, ice_support, media_encryption, 
        rewrite_contact, webrtc, force_rport, rtp_symmetric
      ) 
      VALUES (
        'microsip', 'transport-udp', 'microsip', 'microsip', 'default', 'all', 'alaw,ulaw', 
        'no', 'rfc4733', 'yes', 'no', 
        'yes', 'no', 'yes', 'yes'
      )
      ON CONFLICT (id) DO UPDATE 
      SET 
        transport = 'transport-udp',
        aors = 'microsip',
        auth = 'microsip',
        context = 'default',
        disallow = 'all',
        allow = 'alaw,ulaw',
        direct_media = 'no',
        dtmf_mode = 'rfc4733',
        ice_support = 'yes',
        media_encryption = 'no',
        rewrite_contact = 'yes',
        webrtc = 'no',
        force_rport = 'yes',
        rtp_symmetric = 'yes';
    `);
    console.log('[migration] AddMicroSipAccount inserted ps_endpoints');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем созданные записи
    await queryRunner.query(`DELETE FROM ps_endpoints WHERE id = 'microsip';`);
    await queryRunner.query(`DELETE FROM ps_auths WHERE id = 'microsip';`);
    await queryRunner.query(`DELETE FROM ps_aors WHERE id = 'microsip';`);
  }
}
