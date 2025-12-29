import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCallLogIdToTasks1740000000003 implements MigrationInterface {
  name = 'AddCallLogIdToTasks1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем колонку callLogId в таблицу tasks
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD COLUMN "callLogId" uuid NULL
    `);

    // Добавляем индекс для быстрого поиска задач по логу звонка
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_callLogId" ON "tasks" ("callLogId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индекс
    await queryRunner.query(`
      DROP INDEX "IDX_tasks_callLogId"
    `);

    // Удаляем колонку
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      DROP COLUMN "callLogId"
    `);
  }
}
