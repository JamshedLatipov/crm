import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAssignmentsDemo1740000000002 implements MigrationInterface {
  name = 'SeedAssignmentsDemo1740000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a few example assignment entries linking demo leads/deals to demo users.
    // Use snake_case column names if present (legacy DB uses entity_type/entity_id).
    const hasEntityTypeSnake = await queryRunner.hasColumn('assignments', 'entity_type');
    const hasEntityIdSnake = await queryRunner.hasColumn('assignments', 'entity_id');
    const hasUserIdSnake = await queryRunner.hasColumn('assignments', 'user_id');

    const entityTypeCol = hasEntityTypeSnake ? 'entity_type' : (await queryRunner.hasColumn('assignments', 'entityType') ? '"entityType"' : null);
    const entityIdCol = hasEntityIdSnake ? 'entity_id' : (await queryRunner.hasColumn('assignments', 'entityId') ? '"entityId"' : null);
    const userIdCol = hasUserIdSnake ? 'user_id' : (await queryRunner.hasColumn('assignments', 'userId') ? '"userId"' : null);

    if (!entityTypeCol || !entityIdCol || !userIdCol) {
      console.warn('Assignments table does not have expected polymorphic columns; skipping demo assignments seed.');
      return;
    }

    // Insert assignment for Demo Lead A -> john.doe (if both exist)
    await queryRunner.query(`
      INSERT INTO assignments ("${entityTypeCol}", "${entityIdCol}", "${userIdCol}", created_at, updated_at)
      SELECT 'lead', l.id::text, u.id, now(), now()
      FROM leads l
      JOIN users u ON u.username = 'john.doe'
      WHERE l.name = 'Demo Lead A'
      ON CONFLICT DO NOTHING
    `);

    // Insert assignment for Acme deal -> jane.smith (if both exist)
    await queryRunner.query(`
      INSERT INTO assignments ("${entityTypeCol}", "${entityIdCol}", "${userIdCol}", created_at, updated_at)
      SELECT 'deal', d.id::text, u.id, now(), now()
      FROM deals d
      JOIN users u ON u.username = 'jane.smith'
      WHERE d.title = 'Acme — Website revamp'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove demo assignments created above (based on demo lead/deal names and usernames)
    await queryRunner.query(`DELETE FROM assignments a USING leads l, users u WHERE a.entity_type = 'lead' AND l.name = 'Demo Lead A' AND a.entity_id::text = l.id::text AND u.username = 'john.doe' AND a.user_id = u.id`);
    await queryRunner.query(`DELETE FROM assignments a USING deals d, users u WHERE a.entity_type = 'deal' AND d.title = 'Acme — Website revamp' AND a.entity_id::text = d.id::text AND u.username = 'jane.smith' AND a.user_id = u.id`);
  }
}
