import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCallScriptsTableCategory1761656951300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем новую колонку categoryId
    await queryRunner.query(`
      ALTER TABLE "call_scripts" ADD COLUMN "categoryId" uuid;
    `);

    // Создаем foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "call_scripts"
      ADD CONSTRAINT "FK_call_scripts_categoryId"
      FOREIGN KEY ("categoryId") REFERENCES "call_script_categories"("id") ON DELETE SET NULL;
    `);

    // Обновляем существующие записи, сопоставляя enum значения с ID категорий
    await queryRunner.query(`
      UPDATE "call_scripts"
      SET "categoryId" = (
        SELECT id FROM "call_script_categories"
        WHERE name = CASE
          WHEN "call_scripts"."category"::text = 'general' THEN 'Общие'
          WHEN "call_scripts"."category"::text = 'sales' THEN 'Продажи'
          WHEN "call_scripts"."category"::text = 'support' THEN 'Поддержка'
          WHEN "call_scripts"."category"::text = 'complaints' THEN 'Жалобы'
          WHEN "call_scripts"."category"::text = 'information' THEN 'Информация'
          ELSE 'Общие'
        END
        LIMIT 1
      );
    `);

    // Удаляем старую колонку category
    await queryRunner.query(`
      ALTER TABLE "call_scripts" DROP COLUMN "category";
    `);

    // Создаем индекс для нового foreign key
    await queryRunner.query(`
      CREATE INDEX "IDX_call_scripts_categoryId" ON "call_scripts" ("categoryId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индекс
    await queryRunner.query(`
      DROP INDEX "IDX_call_scripts_categoryId";
    `);

    // Добавляем обратно старую колонку category
    await queryRunner.query(`
      ALTER TABLE "call_scripts" ADD COLUMN "category" varchar(50) DEFAULT 'general';
    `);

    // Обновляем записи, устанавливая enum значения на основе categoryId
    await queryRunner.query(`
      UPDATE "call_scripts"
      SET "category" = (
        SELECT CASE
          WHEN name = 'Общие' THEN 'general'
          WHEN name = 'Продажи' THEN 'sales'
          WHEN name = 'Поддержка' THEN 'support'
          WHEN name = 'Жалобы' THEN 'complaints'
          WHEN name = 'Информация' THEN 'information'
          ELSE 'general'
        END
        FROM "call_script_categories"
        WHERE id = "call_scripts"."categoryId"
      );
    `);

    // Удаляем foreign key constraint и колонку categoryId
    await queryRunner.query(`
      ALTER TABLE "call_scripts" DROP CONSTRAINT "FK_call_scripts_categoryId";
      ALTER TABLE "call_scripts" DROP COLUMN "categoryId";
    `);
  }
}