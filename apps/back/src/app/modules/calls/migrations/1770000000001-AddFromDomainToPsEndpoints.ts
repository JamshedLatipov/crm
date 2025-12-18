import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFromDomainToPsEndpoints1770000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[migration] AddFromDomainToPsEndpoints up starting');

    // Add nullable column from_domain to ps_endpoints
    await queryRunner.query(`ALTER TABLE ps_endpoints ADD COLUMN IF NOT EXISTS from_domain varchar(200)`);

    // Set a sensible default for existing operator endpoints
    await queryRunner.query(`UPDATE ps_endpoints SET from_domain = 'localhost' WHERE id IS NOT NULL`);

    console.log('[migration] AddFromDomainToPsEndpoints up finished');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Removing the column is potentially disruptive; keep as no-op to avoid data loss on revert
  }
}
