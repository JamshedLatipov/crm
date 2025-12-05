import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportQueueAndMembers1769999999999 implements MigrationInterface {
  name = 'CreateSupportQueueAndMembers1769999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create support queue
    await queryRunner.query(`
      INSERT INTO queues (name, description, context, strategy, maxlen, timeout, retry, wrapuptime, announce_frequency, joinempty, leavewhenempty, ringinuse)
      VALUES ('support', 'Support queue for CRM operators', 'default', 'rrmemory', 10, 30, 5, 10, 30, true, true, false)
      ON CONFLICT (name) DO UPDATE SET
        description = 'Support queue for CRM operators',
        context = 'default',
        strategy = 'rrmemory',
        maxlen = 10,
        timeout = 30,
        retry = 5,
        wrapuptime = 10,
        announce_frequency = 30,
        joinempty = true,
        leavewhenempty = true,
        ringinuse = false;
    `);

    // Add operator3 to support queue
    await queryRunner.query(`
      INSERT INTO queue_members (queue_name, member_name, penalty, paused, member_interface, interface, member_type, uniqueid)
      VALUES ('support', 'operator3', 1, false, 'PJSIP/operator3', 'PJSIP/operator3', 'dynamic', 'operator3_realtime')
      ON CONFLICT DO NOTHING;
    `);

    // Add operator4 to support queue
    await queryRunner.query(`
      INSERT INTO queue_members (queue_name, member_name, penalty, paused, member_interface, interface, member_type, uniqueid)
      VALUES ('support', 'operator4', 1, false, 'PJSIP/operator4', 'PJSIP/operator4', 'dynamic', 'operator4_realtime')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM queue_members WHERE queue_name = 'support';`);
    await queryRunner.query(`DELETE FROM queues WHERE name = 'support';`);
  }
}