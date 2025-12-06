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
        "amount", 
        "currency", 
        "probability", 
        "expectedCloseDate", 
        "stageId", 
        "status", 
        "notes"
      ) VALUES
      (
        'Внедрение CRM для ООО "Рога и Копыта"',
        350000.00,
        'TJS',
        80,
        '2025-10-15',
        '${stage3?.id || stage1?.id}',
        'open',
        'Крупный клиент, требует индивидуальную интеграцию'
      ),
      (
        'Продажа телефонной системы',
        150000.00,
        'TJS',
        60,
        '2025-10-30',
        '${stage2?.id || stage1?.id}',
        'open',
        'Интересуется IP-телефонией для офиса на 50 сотрудников'
      ),
      (
        'Консультационные услуги',
        75000.00,
        'TJS',
        40,
        '2025-11-15',
        '${stage1?.id}',
        'open',
        'Стартап, ограниченный бюджет, но перспективный'
      ),
      (
        'Модернизация существующей системы',
        500000.00,
        'TJS',
        90,
        '2025-09-30',
        '${stage4?.id || stage1?.id}',
        'open',
        'Готовы к подписанию контракта, согласовываем детали'
      ),
      (
        'Пробная лицензия',
        25000.00,
        'TJS',
        25,
        '2025-12-01',
        '${stage1?.id}',
        'open',
        'Малый бизнес, рассматривают базовый пакет'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "deals" 
      WHERE "title" IN (
        'Внедрение CRM для ООО "Рога и Копыта"',
        'Продажа телефонной системы',
        'Консультационные услуги',
        'Модернизация существующей системы',
        'Пробная лицензия'
      )
    `);
  }
}
