import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPromoCompaniesDemo1740000000003 implements MigrationInterface {
  name = 'SeedPromoCompaniesDemo1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // promo_companies.id is an integer PK in the current schema; let the DB assign it
    // Use enum values defined in PromoCompany.entity -> PromoCompanyType
    await queryRunner.query(`INSERT INTO promo_companies (name, status, type, "createdAt", "updatedAt") VALUES
      ('Demo Promo A', 'active', 'promoter', now(), now()),
      ('Demo Promo B', 'paused', 'affiliate', now(), now())
      ON CONFLICT DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM promo_companies WHERE name IN ('Demo Promo A','Demo Promo B')`);
  }
}
