import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateCallScriptCategoriesTable1761656938300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: "call_script_categories",
      columns: [
        {
          name: "id",
          type: "uuid",
          isPrimary: true,
          generationStrategy: "uuid",
          default: "uuid_generate_v4()"
        },
        {
          name: "name",
          type: "varchar",
          length: "255",
          isNullable: false
        },
        {
          name: "description",
          type: "text",
          isNullable: true
        },
        {
          name: "color",
          type: "varchar",
          length: "7",
          isNullable: true
        },
        {
          name: "isActive",
          type: "boolean",
          default: true,
          isNullable: false
        },
        {
          name: "sortOrder",
          type: "int",
          default: 0,
          isNullable: false
        },
        {
          name: "createdAt",
          type: "timestamp",
          default: "CURRENT_TIMESTAMP",
          isNullable: false
        },
        {
          name: "updatedAt",
          type: "timestamp",
          default: "CURRENT_TIMESTAMP",
          onUpdate: "CURRENT_TIMESTAMP",
          isNullable: false
        }
      ]
    }), true);

    // Создаем индексы для быстрого поиска
    await queryRunner.query(`
      CREATE INDEX "IDX_call_script_categories_isActive" ON "call_script_categories" ("isActive");
      CREATE INDEX "IDX_call_script_categories_sortOrder" ON "call_script_categories" ("sortOrder");
      CREATE INDEX "IDX_call_script_categories_updatedAt" ON "call_script_categories" ("updatedAt");
    `);

    // Вставляем начальные категории
    await queryRunner.query(`
      INSERT INTO "call_script_categories" ("id", "name", "description", "color", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
      (uuid_generate_v4(), 'Общие', 'Общие скрипты для различных ситуаций', '#2196F3', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (uuid_generate_v4(), 'Продажи', 'Скрипты для работы с продажами', '#4CAF50', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (uuid_generate_v4(), 'Поддержка', 'Скрипты для технической поддержки', '#FF9800', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (uuid_generate_v4(), 'Жалобы', 'Скрипты для работы с жалобами', '#F44336', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (uuid_generate_v4(), 'Информация', 'Информационные скрипты', '#9C27B0', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индексы
    await queryRunner.query(`
      DROP INDEX "IDX_call_script_categories_isActive";
      DROP INDEX "IDX_call_script_categories_sortOrder";
      DROP INDEX "IDX_call_script_categories_updatedAt";
    `);

    // Удаляем таблицу
    await queryRunner.dropTable("call_script_categories");
  }
}