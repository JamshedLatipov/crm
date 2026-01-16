import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnonymousEndpoint1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[migration] AddAnonymousEndpoint up starting');
    
    // 1. Добавляем Endpoint для анонимных входящих вызовов с транка
    // Этот эндпоинт не требует аутентификации и используется для приема вызовов
    await queryRunner.query(`
      INSERT INTO ps_endpoints (
        id, transport, context, disallow, allow, 
        direct_media, dtmf_mode, force_rport, rtp_symmetric, rewrite_contact
      ) 
      VALUES (
        'anonymous', 'transport-udp', 'from-trunk', 'all', 'ulaw,alaw,g729', 
        'no', 'rfc4733', 'yes', 'yes', 'yes'
      )
      ON CONFLICT (id) DO UPDATE 
      SET 
        transport = 'transport-udp',
        context = 'from-trunk',
        disallow = 'all',
        allow = 'ulaw,alaw,g729',
        direct_media = 'no',
        dtmf_mode = 'rfc4733',
        force_rport = 'yes',
        rtp_symmetric = 'yes',
        rewrite_contact = 'yes';
    `);
    console.log('[migration] AddAnonymousEndpoint inserted ps_endpoints');

    // 2. Добавляем Endpoint для внешнего trunk провайдера (109.68.238.170)
    await queryRunner.query(`
      INSERT INTO ps_endpoints (
        id, transport, aors, auth, context, disallow, allow, 
        direct_media, dtmf_mode, ice_support, media_encryption, 
        rewrite_contact, webrtc, force_rport, rtp_symmetric, from_domain
      )
      VALUES (
        'trunk-provider',
        'transport-udp',
        'trunk-provider',
        'trunk-provider-auth',
        'from-trunk',
        'all',
        'ulaw,alaw,g729',
        'no',
        'rfc4733',
        'no',
        'no',
        'yes',
        'no',
        'yes',
        'yes',
        '109.68.238.170'
      )
      ON CONFLICT (id) DO UPDATE SET
        transport = 'transport-udp',
        aors = 'trunk-provider',
        auth = 'trunk-provider-auth',
        context = 'from-trunk',
        disallow = 'all',
        allow = 'ulaw,alaw,g729',
        direct_media = 'no',
        dtmf_mode = 'rfc4733',
        ice_support = 'no',
        media_encryption = 'no',
        rewrite_contact = 'yes',
        webrtc = 'no',
        force_rport = 'yes',
        rtp_symmetric = 'yes',
        from_domain = '109.68.238.170';
    `);
    console.log('[migration] AddAnonymousEndpoint inserted trunk-provider endpoint');

    // 3. Добавляем AOR для trunk провайдера со статическим contact
    await queryRunner.query(`
      INSERT INTO ps_aors (id, contact, qualify_frequency, max_contacts)
      VALUES ('trunk-provider', 'sip:418001011@109.68.238.170', 60, 1)
      ON CONFLICT (id) DO UPDATE SET
        contact = 'sip:418001011@109.68.238.170',
        qualify_frequency = 60,
        max_contacts = 1;
    `);
    console.log('[migration] AddAnonymousEndpoint inserted trunk-provider aor');

    // 4. Добавляем Auth для trunk провайдера (для входящих звонков с авторизацией)
    await queryRunner.query(`
      INSERT INTO ps_auths (id, auth_type, username, password)
      VALUES ('trunk-provider-auth', 'userpass', '418001011', '418001011')
      ON CONFLICT (id) DO UPDATE SET
        auth_type = 'userpass',
        username = '418001011',
        password = '418001011';
    `);
    console.log('[migration] AddAnonymousEndpoint inserted trunk-provider auth');

    // 5. Добавляем IP identify для привязки входящих запросов от провайдера
    // КРИТИЧНО: без этой записи Asterisk не найдет endpoint!
    await queryRunner.query(`
      INSERT INTO ps_endpoint_id_ips (id, endpoint, match)
      VALUES ('trunk-provider-ip', 'trunk-provider', '109.68.238.170')
      ON CONFLICT (id) DO UPDATE SET
        endpoint = 'trunk-provider',
        match = '109.68.238.170';
    `);
    console.log('[migration] AddAnonymousEndpoint inserted trunk-provider IP identify');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем созданные записи
    await queryRunner.query(`DELETE FROM ps_endpoint_id_ips WHERE id = 'trunk-provider-ip';`);
    await queryRunner.query(`DELETE FROM ps_auths WHERE id = 'trunk-provider-auth';`);
    await queryRunner.query(`DELETE FROM ps_aors WHERE id = 'trunk-provider';`);
    await queryRunner.query(`DELETE FROM ps_endpoints WHERE id = 'trunk-provider';`);
    await queryRunner.query(`DELETE FROM ps_endpoints WHERE id = 'anonymous';`);
  }
}
