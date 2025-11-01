import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHierarchicalFieldsToCallScripts1762022731300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем колонку parentId для иерархической структуры
    await queryRunner.query(`
      ALTER TABLE "call_scripts" ADD COLUMN "parentId" uuid;
    `);

    // Добавляем колонку mpath для materialized-path стратегии дерева
    await queryRunner.query(`
      ALTER TABLE "call_scripts" ADD COLUMN "mpath" text;
    `);

    // Добавляем колонку sortOrder для сортировки
    await queryRunner.query(`
      ALTER TABLE "call_scripts" ADD COLUMN "sortOrder" integer DEFAULT 0;
    `);

    // Создаем foreign key constraint для parentId
    await queryRunner.query(`
      ALTER TABLE "call_scripts"
      ADD CONSTRAINT "FK_call_scripts_parentId"
      FOREIGN KEY ("parentId") REFERENCES "call_scripts"("id") ON DELETE CASCADE;
    `);

    // Создаем индексы для новых полей
    await queryRunner.query(`
      CREATE INDEX "IDX_call_scripts_parentId" ON "call_scripts" ("parentId");
      CREATE INDEX "IDX_call_scripts_mpath" ON "call_scripts" ("mpath");
      CREATE INDEX "IDX_call_scripts_sortOrder" ON "call_scripts" ("sortOrder");
    `);

    // Обновляем sortOrder для существующих записей на основе updatedAt
    await queryRunner.query(`
      UPDATE "call_scripts"
      SET "sortOrder" = EXTRACT(epoch FROM "updatedAt")::integer;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индексы
    await queryRunner.query(`
      DROP INDEX "IDX_call_scripts_parentId";
      DROP INDEX "IDX_call_scripts_mpath";
      DROP INDEX "IDX_call_scripts_sortOrder";
    `);

    // Удаляем foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "call_scripts" DROP CONSTRAINT "FK_call_scripts_parentId";
    `);

    // Удаляем колонки
    await queryRunner.query(`
      ALTER TABLE "call_scripts" DROP COLUMN "sortOrder";
      ALTER TABLE "call_scripts" DROP COLUMN "mpath";
      ALTER TABLE "call_scripts" DROP COLUMN "parentId";
    `);
  }
}