import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCompanies1727441200001 implements MigrationInterface {
  name = 'SeedCompanies1727441200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем тестовые компании
    const companies = [
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        name: 'ООО "Рога и Копыта"',
        legalName: 'ООО "Рога и Копыта"',
        inn: '7701234567',
        kpp: '770101001',
        ogrn: '1157746123456',
        type: 'client',
        industry: 'manufacturing',
        size: 'medium',
        employeeCount: 150,
        annualRevenue: 50000000,
        website: 'https://rogaikopyta.ru',
        phone: '+7 (495) 123-45-67',
        email: 'info@rogaikopyta.ru',
        address: 'г. Москва, ул. Ленина, д. 1',
        city: 'Москва',
        region: 'Московская область',
        country: 'Россия',
        postalCode: '101000',
        description: 'Производственная компания с богатой историей',
        notes: 'Надежный клиент, всегда оплачивает вовремя',
        tags: ['производство', 'клиент', 'москва'],
        rating: 5,
        source: 'referral',
        foundedDate: '2010-01-15'
      },
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        name: 'ТехИнновации',
        legalName: 'ООО "ТехИнновации"',
        inn: '7702345678',
        type: 'prospect',  
        industry: 'technology',
        size: 'startup',
        employeeCount: 25,
        website: 'https://techinno.com',
        phone: '+7 (495) 234-56-78',
        email: 'contact@techinno.com',
        address: 'г. Москва, Сколково, ул. Нобеля, д. 5',
        city: 'Москва',
        region: 'Московская область',
        country: 'Россия',
        postalCode: '143026',
        description: 'IT-стартап, разрабатывающий ИИ-решения',
        notes: 'Перспективный prospect, активно развивается',
        tags: ['технологии', 'стартап', 'ии'],
        rating: 4,
        source: 'website'
      },
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
        name: 'МедЦентр "Здоровье"',
        legalName: 'ООО "МедЦентр Здоровье"',
        inn: '7703456789',
        type: 'client',
        industry: 'healthcare', 
        size: 'small',
        employeeCount: 45,
        annualRevenue: 15000000,
        phone: '+7 (495) 345-67-89',
        email: 'info@medcentr-zdorovie.ru',
        address: 'г. Санкт-Петербург, пр. Невский, д. 100',
        city: 'Санкт-Петербург',
        region: 'Ленинградская область', 
        country: 'Россия',
        postalCode: '191025',
        description: 'Частная медицинская клиника полного цикла',
        notes: 'Требует особого внимания к качеству сервиса',
        tags: ['медицина', 'спб', 'клиника'],
        rating: 4,
        source: 'cold_call'
      },
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482',
        name: 'КонсалтГрупп',
        type: 'partner',
        industry: 'consulting',
        size: 'large',
        employeeCount: 500,
        annualRevenue: 200000000,
        website: 'https://konsalt-group.ru',
        phone: '+7 (495) 456-78-90',
        email: 'partners@konsalt-group.ru',
        address: 'г. Москва, Деловой центр "Москва-Сити"',
        city: 'Москва',
        region: 'Московская область',
        country: 'Россия',
        description: 'Крупная консалтинговая компания',
        notes: 'Стратегический партнер',
        tags: ['консалтинг', 'партнер', 'москва-сити'],
        rating: 5,
        source: 'linkedin'
      }
    ];

    for (const company of companies) {
      await queryRunner.query(`
        INSERT INTO "company" (
          "id", "name", "legalName", "inn", "kpp", "ogrn", "type", 
          "industry", "size", "employeeCount", "annualRevenue", 
          "website", "phone", "email", "address", "city", "region", 
          "country", "postalCode", "description", "notes", "tags", 
          "rating", "source", "foundedDate", "firstContactDate", 
          "lastContactDate", "lastActivityDate"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        )
      `, [
        company.id,
        company.name,
        company.legalName || null,
        company.inn || null,
        company.kpp || null,
        company.ogrn || null,
        company.type,
        company.industry || null,
        company.size || null,
        company.employeeCount || null,
        company.annualRevenue || null,
        company.website || null,
        company.phone || null,
        company.email || null,
        company.address || null,
        company.city || null,
        company.region || null,
        company.country || null,
        company.postalCode || null,
        company.description || null,
        company.notes || null,
        company.tags ? company.tags.join(',') : null,
        company.rating || 0,
        company.source || null,
        company.foundedDate || null,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString()
      ]);
    }

    console.log(`Seeded ${companies.length} test companies`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "company" WHERE "id" IN (
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'f47ac10b-58cc-4372-a567-0e02b2c3d480', 
      'f47ac10b-58cc-4372-a567-0e02b2c3d481',
      'f47ac10b-58cc-4372-a567-0e02b2c3d482'
    )`);
  }
}
