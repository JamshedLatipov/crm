import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCommentsDemo1740000000004 implements MigrationInterface {
  name = 'SeedCommentsDemo1740000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert comments using existing demo users as authors (prefer john.doe/jane.smith)
    await queryRunner.query(`
      INSERT INTO comments ("userId", "userName", "entityType", "entityId", text, "createdAt", "updatedAt")
      SELECT id, username, 'lead', '1', 'Demo comment for lead 1', now(), now() FROM users WHERE username = 'john.doe'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO comments ("userId", "userName", "entityType", "entityId", text, "createdAt", "updatedAt")
      SELECT id, username, 'deal', '1', 'Demo comment for deal 1', now(), now() FROM users WHERE username = 'jane.smith'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM comments WHERE text LIKE 'Demo comment for %'`);
  }
}
