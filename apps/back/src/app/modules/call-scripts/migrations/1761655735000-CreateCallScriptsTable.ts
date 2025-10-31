import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateCallScriptsTable1761655735000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: "call_scripts",
      columns: [
        {
          name: "id",
          type: "uuid",
          isPrimary: true,
          generationStrategy: "uuid",
          default: "uuid_generate_v4()"
        },
        {
          name: "title",
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
          name: "category",
          type: "enum",
          enum: ["general", "sales", "support", "complaints", "information"],
          default: "'general'",
          isNullable: false
        },
        {
          name: "steps",
          type: "text",
          isArray: true,
          isNullable: true
        },
        {
          name: "questions",
          type: "text",
          isArray: true,
          isNullable: true
        },
        {
          name: "tips",
          type: "text",
          isArray: true,
          isNullable: true
        },
        {
          name: "isActive",
          type: "boolean",
          default: true,
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
      CREATE INDEX "IDX_call_scripts_category" ON "call_scripts" ("category");
      CREATE INDEX "IDX_call_scripts_isActive" ON "call_scripts" ("isActive");
      CREATE INDEX "IDX_call_scripts_updatedAt" ON "call_scripts" ("updatedAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индексы
    await queryRunner.query(`
      DROP INDEX "IDX_call_scripts_category";
      DROP INDEX "IDX_call_scripts_isActive";
      DROP INDEX "IDX_call_scripts_updatedAt";
    `);

    // Удаляем таблицу
    await queryRunner.dropTable("call_scripts");
  }
}