import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStageTypeColumn1727441000001 implements MigrationInterface {
  name = 'AddStageTypeColumn1727441000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем колонку type для разделения этапов лидов и сделок
    await queryRunner.query(`
      ALTER TABLE "pipeline_stages" 
      ADD COLUMN "type" varchar DEFAULT 'deal_progression'
    `);

    // Добавляем колонку probability для сделок
    await queryRunner.query(`
      ALTER TABLE "pipeline_stages" 
      ADD COLUMN "probability" integer DEFAULT 50
    `);

    // Добавляем колонку isActive
    await queryRunner.query(`
      ALTER TABLE "pipeline_stages" 
      ADD COLUMN "isActive" boolean DEFAULT true
    `);

    // Создаем этапы по умолчанию для сделок
    await queryRunner.query(`
      INSERT INTO "pipeline_stages" ("name", "type", "position", "probability", "isActive") VALUES
      ('Первичный контакт', 'deal_progression', 1, 20, true),
      ('Выявление потребностей', 'deal_progression', 2, 40, true),
      ('Презентация решения', 'deal_progression', 3, 60, true),
      ('Коммерческое предложение', 'deal_progression', 4, 80, true),
      ('Переговоры', 'deal_progression', 5, 90, true),
      ('Закрытие', 'deal_progression', 6, 95, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pipeline_stages" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "pipeline_stages" DROP COLUMN "probability"`);
    await queryRunner.query(`ALTER TABLE "pipeline_stages" DROP COLUMN "isActive"`);
  }
}
