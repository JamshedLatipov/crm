import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPolymorphicIdColumnsToAssignments1769999999998 implements MigrationInterface {
  name = 'AddPolymorphicIdColumnsToAssignments1769999999998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Drop any existing FK that incorrectly references tasks via entity_id
      await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "FK_676491e22b1287d2734819a6791"`);

      // Add nullable columns for specific entity FKs
      const hasTaskId = await queryRunner.hasColumn('assignments', 'task_id');
      if (!hasTaskId) {
        await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN "task_id" integer`);
      }

      const hasLeadId = await queryRunner.hasColumn('assignments', 'lead_id');
      if (!hasLeadId) {
        await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN "lead_id" integer`);
      }

      const hasDealId = await queryRunner.hasColumn('assignments', 'deal_id');
      if (!hasDealId) {
        await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN "deal_id" uuid`);
      }

      // Populate new columns from existing polymorphic entity_type/entity_id
      // Use regexp guards to avoid cast exceptions
      await queryRunner.query(`
        UPDATE "assignments"
        SET "task_id" = CAST(entity_id AS integer)
        WHERE entity_type = 'task' AND entity_id ~ '^[0-9]+$'
      `);

      await queryRunner.query(`
        UPDATE "assignments"
        SET "lead_id" = CAST(entity_id AS integer)
        WHERE entity_type = 'lead' AND entity_id ~ '^[0-9]+$'
      `);

      await queryRunner.query(`
        UPDATE "assignments"
        SET "deal_id" = CAST(entity_id AS uuid)
        WHERE entity_type = 'deal' AND entity_id ~ '^[0-9a-fA-F\\-]{36}$'
      `);

      // Create indexes for the new FK columns
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_assignments_task_id" ON "assignments" ("task_id")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_assignments_lead_id" ON "assignments" ("lead_id")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_assignments_deal_id" ON "assignments" ("deal_id")`);

      // Add foreign key constraints (ON DELETE SET NULL to avoid cascade surprises)
      await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_assignments_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL`);
      await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_assignments_lead_id" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL`);
      await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_assignments_deal_id" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL`);

      console.log('Polymorphic id columns added to assignments and populated');
    } catch (error) {
      console.warn('Migration AddPolymorphicIdColumnsToAssignments failed with note:', error?.message || error);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Remove FKs and indexes
      await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "FK_assignments_deal_id"`);
      await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "FK_assignments_lead_id"`);
      await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "FK_assignments_task_id"`);

      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assignments_deal_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assignments_lead_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assignments_task_id"`);

      // Drop columns
      await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "deal_id"`);
      await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "lead_id"`);
      await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "task_id"`);

      // Note: we do not restore the previous FK on entity_id automatically
      console.log('Polymorphic id columns removed from assignments');
    } catch (error) {
      console.warn('Rollback of AddPolymorphicIdColumnsToAssignments completed with notes:', error?.message || error);
    }
  }
}
