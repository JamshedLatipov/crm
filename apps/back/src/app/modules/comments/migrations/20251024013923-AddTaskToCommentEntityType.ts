import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskToCommentEntityType20251024013923 implements MigrationInterface {
  name = 'AddTaskToCommentEntityType20251024013923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем значение 'task' к существующему enum comments_entitytype_enum
    await queryRunner.query(`
      ALTER TYPE "comments_entitytype_enum" ADD VALUE IF NOT EXISTS 'task';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL не поддерживает удаление значений из enum,
    // поэтому оставляем down миграцию пустой или создаем новый enum без 'task'
    // В данном случае оставляем пустой down, так как это добавление значения
  }
}