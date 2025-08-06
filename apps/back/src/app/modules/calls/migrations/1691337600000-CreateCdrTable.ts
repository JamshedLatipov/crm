import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCdrTable1691337600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cdr (
        calldate timestamp without time zone NOT NULL,
        clid character varying(80) NOT NULL,
        src character varying(80) NOT NULL,
        dst character varying(80) NOT NULL,
        dcontext character varying(80) NOT NULL,
        channel character varying(80) NOT NULL,
        dstchannel character varying(80) NOT NULL,
        lastapp character varying(80) NOT NULL,
        lastdata character varying(80) NOT NULL,
        duration integer NOT NULL,
        billsec integer NOT NULL,
        disposition character varying(45) NOT NULL,
        amaflags integer NOT NULL,
        accountcode character varying(20) NOT NULL,
        uniqueid character varying(32) NOT NULL,
        userfield character varying(255) NOT NULL,
        sequence integer NOT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cdr;`);
  }
}
