import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserActivitiesTable1691337604000 implements MigrationInterface {
  name = 'CreateUserActivitiesTable1691337604000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" integer NOT NULL,
        type varchar NOT NULL,
        metadata jsonb,
        description text,
        "ipAddress" inet,
        "userAgent" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_activities" PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_activities_user_id" ON user_activities ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_activities_type" ON user_activities (type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_activities_created_at" ON user_activities ("createdAt");
    `);

    await queryRunner.query(`
      ALTER TABLE user_activities ADD CONSTRAINT "FK_user_activities_user"
        FOREIGN KEY ("userId") REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS "FK_user_activities_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_activities_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_activities_type";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_activities_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_activities;`);
  }
}