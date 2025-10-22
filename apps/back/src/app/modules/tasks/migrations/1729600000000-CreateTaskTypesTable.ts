import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskTypesTable1729600000000 implements MigrationInterface {
  name = 'CreateTaskTypesTable1729600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем таблицу типов задач
    await queryRunner.query(`
      CREATE TABLE "task_types" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "color" character varying,
        "icon" character varying,
        "timeFrameSettings" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_task_types_name" UNIQUE ("name"),
        CONSTRAINT "PK_task_types" PRIMARY KEY ("id")
      )
    `);

    // Добавляем колонку taskTypeId в таблицу tasks
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD COLUMN "taskTypeId" integer
    `);

    // Создаем внешний ключ
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_taskTypeId" 
      FOREIGN KEY ("taskTypeId") 
      REFERENCES "task_types"("id") 
      ON DELETE SET NULL 
      ON UPDATE NO ACTION
    `);

    // Создаем индекс для быстрого поиска
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_taskTypeId" ON "tasks" ("taskTypeId")
    `);

    // Добавляем базовые типы задач
    await queryRunner.query(`
      INSERT INTO "task_types" ("name", "description", "color", "icon", "timeFrameSettings", "sortOrder") VALUES
      (
        'Звонок',
        'Задача для совершения звонка клиенту',
        '#3B82F6',
        'phone',
        '{"defaultDuration": 30, "minDuration": 5, "maxDuration": 120, "reminderBeforeDeadline": 15, "allowNoDueDate": false, "workingDays": [1,2,3,4,5], "workingHours": {"start": "09:00", "end": "18:00"}, "skipWeekends": true}'::jsonb,
        1
      ),
      (
        'Встреча',
        'Задача для организации встречи с клиентом',
        '#10B981',
        'calendar',
        '{"defaultDuration": 60, "minDuration": 30, "maxDuration": 480, "reminderBeforeDeadline": 60, "warningBeforeDeadline": 120, "allowNoDueDate": false, "workingDays": [1,2,3,4,5], "workingHours": {"start": "09:00", "end": "18:00"}, "skipWeekends": true}'::jsonb,
        2
      ),
      (
        'Email',
        'Задача для отправки email клиенту',
        '#8B5CF6',
        'mail',
        '{"defaultDuration": 1440, "reminderBeforeDeadline": 240, "allowNoDueDate": true, "workingDays": [1,2,3,4,5,6,7]}'::jsonb,
        3
      ),
      (
        'Обработка заявки',
        'Задача для обработки входящей заявки',
        '#F59E0B',
        'clipboard',
        '{"defaultDuration": 120, "slaResponseTime": 30, "slaResolutionTime": 240, "reminderBeforeDeadline": 30, "allowNoDueDate": false, "workingDays": [1,2,3,4,5], "workingHours": {"start": "09:00", "end": "18:00"}, "skipWeekends": true}'::jsonb,
        4
      ),
      (
        'Общая задача',
        'Универсальная задача без специфических настроек',
        '#6B7280',
        'check-square',
        '{"allowNoDueDate": true}'::jsonb,
        5
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индекс
    await queryRunner.query(`DROP INDEX "IDX_tasks_taskTypeId"`);

    // Удаляем внешний ключ
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_taskTypeId"`);

    // Удаляем колонку
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "taskTypeId"`);

    // Удаляем таблицу типов задач
    await queryRunner.query(`DROP TABLE "task_types"`);
  }
}
