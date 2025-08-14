import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSipEndpointRelation1691337602000 implements MigrationInterface {
  name = 'AddUserSipEndpointRelation1691337602000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column if not exists (idempotent guard using DO block)
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='sip_endpoint_id'
      ) THEN
        ALTER TABLE users ADD COLUMN sip_endpoint_id varchar(40);
      END IF;
    END$$;`);

    // Add UNIQUE constraint to enforce 1-1 mapping (if desired)
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UQ_users_sip_endpoint_id'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT "UQ_users_sip_endpoint_id" UNIQUE (sip_endpoint_id);
      END IF;
    END$$;`);

    // Add FK constraint
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_sip_endpoint'
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
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS sip_endpoint_id;`);
  }
}
