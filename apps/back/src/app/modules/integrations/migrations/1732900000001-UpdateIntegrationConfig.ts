import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateIntegrationConfig1732900000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "integration_config" 
            DROP COLUMN "urlTemplate",
            DROP COLUMN "method",
            DROP COLUMN "headers",
            DROP COLUMN "mapping";
        `);
        
        await queryRunner.query(`
            ALTER TABLE "integration_config" 
            ADD COLUMN "sources" jsonb NOT NULL DEFAULT '[]';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "integration_config" 
            DROP COLUMN "sources";
        `);
        
        await queryRunner.query(`
            ALTER TABLE "integration_config" 
            ADD COLUMN "urlTemplate" character varying NOT NULL DEFAULT '',
            ADD COLUMN "method" character varying NOT NULL DEFAULT 'GET',
            ADD COLUMN "headers" jsonb,
            ADD COLUMN "mapping" jsonb;
        `);
    }
}
