import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTasksDemo1740000000002 implements MigrationInterface {
  name = 'SeedTasksDemo1740000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert tasks; tasks table may not have a direct assigned column (assignments are centralized).
    const hasAssignedToSnake = await queryRunner.hasColumn('tasks', 'assigned_to');
    const hasAssignedToCamel = await queryRunner.hasColumn('tasks', 'assignedTo');

    if (hasAssignedToSnake || hasAssignedToCamel) {
      const assignedCol = hasAssignedToSnake ? 'assigned_to' : '"assignedTo"';
      await queryRunner.query(`INSERT INTO tasks (title, description, ${assignedCol}, "dueDate", status, "createdAt", "updatedAt") VALUES
        ('Demo: Call Acme', 'Phone call to qualify requirements', 'john.doe', now() + interval '2 days', 'open', now(), now()),
        ('Demo: Prepare proposal', 'Draft initial proposal document', 'jane.smith', now() + interval '5 days', 'open', now(), now())
        ON CONFLICT DO NOTHING`);
    } else {
      // Insert tasks without assigned column
      await queryRunner.query(`INSERT INTO tasks (title, description, "dueDate", status, "createdAt", "updatedAt") VALUES
        ('Demo: Call Acme', 'Phone call to qualify requirements', now() + interval '2 days', 'open', now(), now()),
        ('Demo: Prepare proposal', 'Draft initial proposal document', now() + interval '5 days', 'open', now(), now())
        ON CONFLICT DO NOTHING`);

      // Create assignments linking tasks to users via assignments table if possible
      const hasAssignments = await queryRunner.hasTable('assignments');
      if (hasAssignments) {
        // detect column naming in assignments table
        const hasEntityTypeSnake = await queryRunner.hasColumn('assignments', 'entity_type');
        const hasEntityTypeCamel = await queryRunner.hasColumn('assignments', 'entityType');
        const hasEntityIdSnake = await queryRunner.hasColumn('assignments', 'entity_id');
        const hasEntityIdCamel = await queryRunner.hasColumn('assignments', 'entityId');
        const hasUserIdSnake = await queryRunner.hasColumn('assignments', 'user_id');
        const hasUserIdCamel = await queryRunner.hasColumn('assignments', 'userId');
        const hasCreatedAtSnake = await queryRunner.hasColumn('assignments', 'created_at');
        const hasCreatedAtCamel = await queryRunner.hasColumn('assignments', 'createdAt');
        const hasUpdatedAtSnake = await queryRunner.hasColumn('assignments', 'updated_at');
        const hasUpdatedAtCamel = await queryRunner.hasColumn('assignments', 'updatedAt');

        const entityTypeCol = hasEntityTypeSnake ? 'entity_type' : (hasEntityTypeCamel ? '"entityType"' : null);
        const entityIdCol = hasEntityIdSnake ? 'entity_id' : (hasEntityIdCamel ? '"entityId"' : null);
        const userIdCol = hasUserIdSnake ? 'user_id' : (hasUserIdCamel ? '"userId"' : null);
        const createdAtCol = hasCreatedAtSnake ? 'created_at' : (hasCreatedAtCamel ? '"createdAt"' : 'created_at');
        const updatedAtCol = hasUpdatedAtSnake ? 'updated_at' : (hasUpdatedAtCamel ? '"updatedAt"' : 'updated_at');

        if (!entityTypeCol || !entityIdCol || !userIdCol) {
          // unexpected schema; skip creating assignment rows
          console.warn('Assignments table schema not detected as expected; skipping task->assignment linking');
        } else {
          // Assign first task to john.doe
          await queryRunner.query(`
            INSERT INTO assignments (${entityTypeCol}, ${entityIdCol}, ${userIdCol}, ${createdAtCol}, ${updatedAtCol})
            SELECT 'task', t.id::text, u.id, now(), now()
            FROM tasks t JOIN users u ON u.username='john.doe'
            WHERE t.title = 'Demo: Call Acme'
            ON CONFLICT DO NOTHING
          `);

          // Assign second task to jane.smith
          await queryRunner.query(`
            INSERT INTO assignments (${entityTypeCol}, ${entityIdCol}, ${userIdCol}, ${createdAtCol}, ${updatedAtCol})
            SELECT 'task', t.id::text, u.id, now(), now()
            FROM tasks t JOIN users u ON u.username='jane.smith'
            WHERE t.title = 'Demo: Prepare proposal'
            ON CONFLICT DO NOTHING
          `);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove demo tasks and any demo assignments linked to them
    const hasAssignments = await queryRunner.hasTable('assignments');
    if (hasAssignments) {
      // detect columns similar to above
      const hasEntityTypeSnake = await queryRunner.hasColumn('assignments', 'entity_type');
      const hasEntityTypeCamel = await queryRunner.hasColumn('assignments', 'entityType');
      const hasEntityIdSnake = await queryRunner.hasColumn('assignments', 'entity_id');
      const hasEntityIdCamel = await queryRunner.hasColumn('assignments', 'entityId');

      const entityTypeCol = hasEntityTypeSnake ? 'entity_type' : (hasEntityTypeCamel ? '"entityType"' : null);
      const entityIdCol = hasEntityIdSnake ? 'entity_id' : (hasEntityIdCamel ? '"entityId"' : null);

      if (entityTypeCol && entityIdCol) {
        await queryRunner.query(`DELETE FROM assignments a USING tasks t WHERE t.title IN ('Demo: Call Acme','Demo: Prepare proposal') AND a.${entityTypeCol} = 'task' AND a.${entityIdCol}::text = t.id::text`);
      }
    }
    await queryRunner.query(`DELETE FROM tasks WHERE title IN ('Demo: Call Acme','Demo: Prepare proposal')`);
  }
}
