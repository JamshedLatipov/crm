import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1691337602500 implements MigrationInterface {
  name = 'CreateUsersTable1691337602500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username varchar NOT NULL UNIQUE,
        password varchar NOT NULL,
        roles text NOT NULL,
        "isActive" boolean DEFAULT true,
        sip_endpoint_id varchar(40)
      );
    `);

    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='sip_endpoint_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UQ_users_sip_endpoint_id'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT "UQ_users_sip_endpoint_id" UNIQUE (sip_endpoint_id);
      END IF;
    END$$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ps_endpoints')
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name='users' AND column_name='sip_endpoint_id'
         )
         AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname='FK_users_sip_endpoint'
         ) THEN
        ALTER TABLE users ADD CONSTRAINT "FK_users_sip_endpoint"
          FOREIGN KEY (sip_endpoint_id) REFERENCES ps_endpoints(id)
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END$$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "FK_users_sip_endpoint";`);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "UQ_users_sip_endpoint_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
