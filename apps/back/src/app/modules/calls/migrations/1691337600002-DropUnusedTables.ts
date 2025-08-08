import { MigrationInterface, QueryRunner } from "typeorm";

export class DropUnusedTables1691337600002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Удаляем таблицы, которые больше не используются
    await queryRunner.query(`
      DROP TABLE IF EXISTS ps_globals;
      DROP TABLE IF EXISTS ps_registrations;
      DROP TABLE IF EXISTS ps_qualify;
      DROP TABLE IF EXISTS ps_contacts;
      DROP TABLE IF EXISTS ps_endpoint_id_ips;
      DROP TABLE IF EXISTS ps_domain_aliases;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Восстановление удаленных таблиц
    // Примечание: это простое восстановление структуры, данные будут потеряны
    await queryRunner.query(`
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
}
