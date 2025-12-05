import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPipelineStagesDemo1740000000001 implements MigrationInterface {
  name = 'SeedPipelineStagesDemo1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO pipeline_stages (id, name, type, position, probability, "createdAt", "updatedAt") VALUES
      (gen_random_uuid(), 'Qualification', 'deal_progression', 1, 10, now(), now()),
      (gen_random_uuid(), 'Proposal', 'deal_progression', 2, 50, now(), now()),
      (gen_random_uuid(), 'Negotiation', 'deal_progression', 3, 75, now(), now())
      ON CONFLICT DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pipeline_stages WHERE name IN ('Qualification','Proposal','Negotiation')`);
  }
}
