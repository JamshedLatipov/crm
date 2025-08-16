import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQueuesTables1691337603000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS queues (
        id SERIAL PRIMARY KEY,
        name VARCHAR(80) UNIQUE,
        description TEXT,
        context VARCHAR(40),
        strategy VARCHAR(40),
        musicclass VARCHAR(40),
        maxlen INTEGER DEFAULT 0,
        timeout INTEGER DEFAULT 15,
        retry INTEGER DEFAULT 0,
        wrapuptime INTEGER DEFAULT 0,
        announce_frequency INTEGER DEFAULT 0,
        joinempty BOOLEAN DEFAULT true,
        leavewhenempty BOOLEAN DEFAULT true,
        ringinuse BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS queue_members (
        id SERIAL PRIMARY KEY,
        queue_name VARCHAR(80),
        member_name TEXT,
        penalty INTEGER DEFAULT 0,
        member_type VARCHAR(40),
        paused BOOLEAN DEFAULT false,
        memberid TEXT,
        member_interface TEXT
      );

  -- Insert test queue and members (idempotent)
  INSERT INTO queues (name, description, context, strategy, musicclass, maxlen, timeout, retry, wrapuptime, announce_frequency, joinempty, leavewhenempty, ringinuse)
  SELECT 'support', 'Support queue for testing', 'default', 'ringall', 'default', 0, 15, 0, 0, 0, true, true, false
  WHERE NOT EXISTS (SELECT 1 FROM queues WHERE name = 'support');

  INSERT INTO queue_members (queue_name, member_name, penalty, member_type, paused, memberid, member_interface)
  SELECT 'support', 'PJSIP/operator1', 0, 'pjsip', false, 'operator1', 'PJSIP/operator1'
  WHERE NOT EXISTS (SELECT 1 FROM queue_members WHERE queue_name = 'support' AND member_interface = 'PJSIP/operator1');

  INSERT INTO queue_members (queue_name, member_name, penalty, member_type, paused, memberid, member_interface)
  SELECT 'support', 'PJSIP/operator2', 0, 'pjsip', false, 'operator2', 'PJSIP/operator2'
  WHERE NOT EXISTS (SELECT 1 FROM queue_members WHERE queue_name = 'support' AND member_interface = 'PJSIP/operator2');
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
