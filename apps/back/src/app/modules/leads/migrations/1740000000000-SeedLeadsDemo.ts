import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadsDemo1740000000000 implements MigrationInterface {
  name = 'SeedLeadsDemo1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO leads (name, email, phone, status, score, source, priority, "createdAt", "updatedAt") VALUES
      ('Demo Lead A', 'demo.a@example.com', '+7 495 700-0001', 'new', 10, 'website', 'medium', now(), now()),
      ('Demo Lead B', 'demo.b@example.com', '+7 495 700-0002', 'contacted', 65, 'linkedin', 'high', now(), now())
      ON CONFLICT DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM leads WHERE name IN ('Demo Lead A','Demo Lead B')`);
  }
}
