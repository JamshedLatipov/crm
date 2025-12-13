import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAssignedToFromTasks1769999999999 implements MigrationInterface {
  name = 'DropAssignedToFromTasks1769999999999'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop any variant of the assigned field that might exist depending on previous migrations or sync
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "assignedTo"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "assignedToId"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "assigned_to"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "assigned_to_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate a nullable foreign key column back to users.id
    await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignedToId" integer`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT IF NOT EXISTS "FK_tasks_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL`);
  }
}
