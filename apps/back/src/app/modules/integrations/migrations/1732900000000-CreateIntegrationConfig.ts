import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIntegrationConfig1732900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "integration_config" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "urlTemplate" character varying NOT NULL,
                "method" character varying NOT NULL DEFAULT 'GET',
                "headers" jsonb,
                "mapping" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_integration_config_id" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "integration_config"`);
    }
}
