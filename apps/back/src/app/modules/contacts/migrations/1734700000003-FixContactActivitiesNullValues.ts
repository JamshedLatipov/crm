import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixContactActivitiesNullValues1734700000003 implements MigrationInterface {
  name = 'FixContactActivitiesNullValues1734700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Проверяем существует ли таблица
    const tableExists = await queryRunner.hasTable('contact_activities');
    
    if (tableExists) {
      // Обновляем NULL значения в title
      await queryRunner.query(`
        UPDATE contact_activities 
        SET title = 'Активность' 
        WHERE title IS NULL
      `);

      // Обновляем NULL значения в type
      await queryRunner.query(`
        UPDATE contact_activities 
        SET type = 'system' 
        WHERE type IS NULL
      `);

      // Теперь можем безопасно добавить NOT NULL ограничения
      await queryRunner.query(`
        ALTER TABLE contact_activities 
        ALTER COLUMN title SET NOT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE contact_activities 
        ALTER COLUMN type SET NOT NULL
      `);

      console.log('Fixed NULL values in contact_activities table');
    } else {
      // Если таблицы нет, создаем её
      await queryRunner.query(`
        CREATE TABLE "contact_activities" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "contact_id" uuid NOT NULL,
          "type" character varying NOT NULL DEFAULT 'system',
          "title" character varying NOT NULL DEFAULT 'Активность',
          "description" text,
          "user_id" character varying,
          "user_name" character varying,
          "metadata" jsonb,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_contact_activities" PRIMARY KEY ("id")
        )
      `);

      // Создаем foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "contact_activities" 
        ADD CONSTRAINT "FK_contact_activities_contact" 
        FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE
      `);

      // Создаем индексы
      await queryRunner.query(`CREATE INDEX "IDX_contact_activities_contact_id" ON "contact_activities" ("contact_id")`);
      await queryRunner.query(`CREATE INDEX "IDX_contact_activities_type" ON "contact_activities" ("type")`);
      await queryRunner.query(`CREATE INDEX "IDX_contact_activities_created_at" ON "contact_activities" ("created_at")`);

      console.log('Created contact_activities table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // В down миграции можем просто удалить таблицу
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_activities" CASCADE`);
  }
}