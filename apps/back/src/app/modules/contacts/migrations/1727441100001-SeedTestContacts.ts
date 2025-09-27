import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestContacts1727441100001 implements MigrationInterface {
  name = 'SeedTestContacts1727441100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "contacts" (
        "type", 
        "name", 
        "firstName", 
        "lastName", 
        "email", 
        "phone", 
        "company", 
        "position", 
        "source", 
        "assignedTo", 
        "tags", 
        "notes"
      ) VALUES
      (
        'person',
        'Иван Петров',
        'Иван',
        'Петров',
        'i.petrov@roga-kopyta.ru',
        '+7 (495) 123-45-67',
        'ООО Рога и Копыта',
        'Генеральный директор',
        'website',
        'admin',
        'vip,decision_maker',
        'Ключевой контакт, принимает решения по IT'
      ),
      (
        'person',
        'Мария Сидорова',
        'Мария',
        'Сидорова',
        'm.sidorova@tech-company.ru',
        '+7 (812) 987-65-43',
        'ТехКомпани',
        'IT директор',
        'referral',
        'admin',
        'technical,influencer',
        'Технический специалист, влияет на решения'
      ),
      (
        'person',
        'Алексей Козлов',
        'Алексей',
        'Козлов',
        'a.kozlov@startup.io',
        '+7 (921) 555-77-88',
        'StartupIO',
        'Основатель',
        'social_media',
        'admin',
        'startup,budget_limited',
        'Молодая компания, ограниченный бюджет'
      ),
      (
        'person',
        'Елена Васильева',
        'Елена',
        'Васильева',
        'e.vasilieva@big-corp.com',
        '+7 (495) 777-88-99',
        'БигКорп',
        'Руководитель отдела закупок',
        'advertising',
        'admin',
        'enterprise,procurement',
        'Крупная корпорация, сложные процедуры закупок'
      ),
      (
        'person',
        'Дмитрий Новиков',
        'Дмитрий',
        'Новиков',
        'd.novikov@small-biz.ru',
        '+7 (383) 444-55-66',
        'СмолБиз',
        'Владелец',
        'phone',
        'admin',
        'small_business,price_sensitive',
        'Малый бизнес, чувствителен к цене'
      ),
      (
        'company',
        'ТехноСофт',
        null,
        null,
        'info@technosoft.ru',
        '+7 (495) 888-99-00',
        'ТехноСофт',
        null,
        'website',
        'admin',
        'partner,integration',
        'Партнер по интеграции систем'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "contacts" WHERE "assignedTo" = 'admin'`);
  }
}
