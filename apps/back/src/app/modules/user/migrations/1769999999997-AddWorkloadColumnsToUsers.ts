import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkloadColumnsToUsers1769999999997 implements MigrationInterface {
  name = 'AddWorkloadColumnsToUsers1769999999997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add current and max columns for deals and tasks if they don't exist
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "currentDealsCount" integer DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "maxDealsCapacity" integer DEFAULT 20;`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "currentTasksCount" integer DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "maxTasksCapacity" integer DEFAULT 30;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "maxTasksCapacity";`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "currentTasksCount";`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "maxDealsCapacity";`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "currentDealsCount";`);
  }
}
