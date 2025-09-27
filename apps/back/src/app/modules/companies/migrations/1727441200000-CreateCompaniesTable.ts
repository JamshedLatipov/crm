import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompaniesTable1727441200000 implements MigrationInterface {
  name = 'CreateCompaniesTable1727441200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Проверяем и создаем типы только если они не существуют
    try {
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."company_type_enum" AS ENUM('client', 'prospect', 'partner', 'competitor', 'vendor');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."company_size_enum" AS ENUM('startup', 'small', 'medium', 'large', 'enterprise');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."industry_enum" AS ENUM('technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'real_estate', 'consulting', 'media', 'government', 'other');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    } catch (error) {
      console.log('Some enum types already exist, continuing...', error.message);
    }

    // Проверяем, существует ли таблица
    const hasTable = await queryRunner.hasTable('company');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE "company" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "legalName" character varying(50),
        "inn" character varying(20),
        "kpp" character varying(20),
        "ogrn" character varying(20),
        "type" "public"."company_type_enum" NOT NULL DEFAULT 'prospect',
        "industry" "public"."industry_enum",
        "size" "public"."company_size_enum",
        "employeeCount" integer,
        "annualRevenue" numeric(15,2),
        "website" character varying(255),
        "phone" character varying(50),
        "email" character varying(100),
        "address" character varying(500),
        "city" character varying(100),
        "region" character varying(100),
        "country" character varying(100),
        "postalCode" character varying(20),
        "socialMedia" json,
        "description" text,
        "notes" text,
        "tags" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "isBlacklisted" boolean NOT NULL DEFAULT false,
        "blacklistReason" text,
        "foundedDate" TIMESTAMP,
        "firstContactDate" TIMESTAMP,
        "lastContactDate" TIMESTAMP,
        "lastActivityDate" TIMESTAMP,
        "rating" integer NOT NULL DEFAULT '0',
        "source" character varying(100),
        "ownerId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_id" PRIMARY KEY ("id")
      )
    `);

      // Создаем индексы для оптимизации поиска
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_name" ON "company" ("name")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_inn" ON "company" ("inn")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_type" ON "company" ("type")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_industry" ON "company" ("industry")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_city" ON "company" ("city")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_ownerId" ON "company" ("ownerId")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_isActive" ON "company" ("isActive")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_lastActivityDate" ON "company" ("lastActivityDate")`);

      console.log('Companies table created successfully');
    } else {
      console.log('Companies table already exists, skipping creation');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_company_lastActivityDate"`);
    await queryRunner.query(`DROP INDEX "IDX_company_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_company_ownerId"`);
    await queryRunner.query(`DROP INDEX "IDX_company_city"`);
    await queryRunner.query(`DROP INDEX "IDX_company_industry"`);
    await queryRunner.query(`DROP INDEX "IDX_company_type"`);
    await queryRunner.query(`DROP INDEX "IDX_company_inn"`);
    await queryRunner.query(`DROP INDEX "IDX_company_name"`);
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(`DROP TYPE "public"."industry_enum"`);
    await queryRunner.query(`DROP TYPE "public"."company_size_enum"`);
    await queryRunner.query(`DROP TYPE "public"."company_type_enum"`);
  }
}
