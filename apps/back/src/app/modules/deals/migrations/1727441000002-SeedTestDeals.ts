import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestDeals1727441000002 implements MigrationInterface {
  name = 'SeedTestDeals1727441000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Получаем ID этапов
    const stages = await queryRunner.query(`
      SELECT id, name FROM "pipeline_stages" 
      WHERE "type" = 'deal_progression' 
      ORDER BY "position"
    `);

    if (stages.length === 0) {
      console.log('No deal stages found, skipping test deals creation');
      return;
    }

    const [stage1, stage2, stage3, stage4] = stages;

    // Создаем тестовые сделки
    await queryRunner.query(`
      INSERT INTO "deals" (
        "title", 
        "contact", 
        "amount", 
        "currency", 
        "probability", 
        "expectedCloseDate", 
        "stageId", 
        "status", 
        "assignedTo", 
        "notes"
      ) VALUES
      (
        'Внедрение CRM для ООО "Рога и Копыта"',
        '{"name": "Иван Петров", "email": "i.petrov@roga-kopyta.ru", "phone": "+7 (495) 123-45-67", "company": "ООО Рога и Копыта"}',
        350000.00,
        'TJS',
        80,
        '2025-10-15',
        '${stage3?.id || stage1?.id}',
        'open',
        'admin',
        'Крупный клиент, требует индивидуальную интеграцию'
      ),
      (
        'Продажа телефонной системы',
        '{"name": "Мария Сидорова", "email": "m.sidorova@tech-company.ru", "phone": "+7 (812) 987-65-43", "company": "ТехКомпани"}',
        150000.00,
        'TJS',
        60,
        '2025-10-30',
        '${stage2?.id || stage1?.id}',
        'open',
        'admin',
        'Интересуется IP-телефонией для офиса на 50 сотрудников'
      ),
      (
        'Консультационные услуги',
        '{"name": "Алексей Козлов", "email": "a.kozlov@startup.io", "phone": "+7 (921) 555-77-88", "company": "StartupIO"}',
        75000.00,
        'TJS',
        40,
        '2025-11-15',
        '${stage1?.id}',
        'open',
        'admin',
        'Стартап, ограниченный бюджет, но перспективный'
      ),
      (
        'Модернизация существующей системы',
        '{"name": "Елена Васильева", "email": "e.vasilieva@big-corp.com", "phone": "+7 (495) 777-88-99", "company": "БигКорп"}',
        500000.00,
        'TJS',
        90,
        '2025-09-30',
        '${stage4?.id || stage1?.id}',
        'open',
        'admin',
        'Готовы к подписанию контракта, согласовываем детали'
      ),
      (
        'Пробная лицензия',
        '{"name": "Дмитрий Новиков", "email": "d.novikov@small-biz.ru", "phone": "+7 (383) 444-55-66", "company": "СмолБиз"}',
        25000.00,
        'TJS',
        25,
        '2025-12-01',
        '${stage1?.id}',
        'open',
        'admin',
        'Малый бизнес, рассматривают базовый пакет'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "deals" WHERE "assignedTo" = 'admin'`);
  }
}
