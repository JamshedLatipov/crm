import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQueuesTables1691337603000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  -- Insert test queue and members (idempotent)
  INSERT INTO queues (name, description, context, strategy, musicclass, maxlen, timeout, retry, wrapuptime, announce_frequency, joinempty, leavewhenempty, ringinuse)
  SELECT 'support', 'Support queue for testing', 'default', 'ringall', 'default', 0, 15, 0, 0, 0, true, true, false
  WHERE NOT EXISTS (SELECT 1 FROM queues WHERE name = 'support');

  INSERT INTO queue_members (queue_name, member_name, penalty, member_type, paused, memberid, interface, uniqueid)
  SELECT 'support', 'PJSIP/operator1', 0, 'pjsip', false, 'operator1', 'PJSIP/operator1', 'PJSIP/operator1'
  WHERE NOT EXISTS (SELECT 1 FROM queue_members WHERE queue_name = 'support' AND interface = 'PJSIP/operator1');

  INSERT INTO queue_members (queue_name, member_name, penalty, member_type, paused, memberid, interface, uniqueid)
  SELECT 'support', 'PJSIP/operator2', 0, 'pjsip', false, 'operator2', 'PJSIP/operator2', 'PJSIP/operator2'
  WHERE NOT EXISTS (SELECT 1 FROM queue_members WHERE queue_name = 'support' AND interface = 'PJSIP/operator2');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM queue_members WHERE queue_name = 'support';
      DELETE FROM queues WHERE name = 'support';
      DROP TABLE IF EXISTS queue_members;
      DROP TABLE IF EXISTS queues;
    `);
  }
}
