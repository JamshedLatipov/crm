import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedOperator3And4Users1769999999998 implements MigrationInterface {
  name = 'SeedOperator3And4Users1769999999998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = '$2b$10$h21TvWmjh3vy6miKYtIp7e3bjAv6JZ7fiYYZZ8G2yBrux21UZw3Vu'; // admin123

    // Check if columns exist
    const hasSipEndpoint = await this.columnExists(queryRunner, 'users', 'sip_endpoint_id');
    const hasIsActive = await this.columnExists(queryRunner, 'users', 'isActive');

    // Seed operator3 user
    const cols3 = ['username', 'password', 'roles'];
    if (hasIsActive) cols3.push('"isActive"');
    if (hasSipEndpoint) cols3.push('sip_endpoint_id');

    const values3 = [`'operator3'`, `'${passwordHash}'`, `'operator'`];
    if (hasIsActive) values3.push('true');
    if (hasSipEndpoint) values3.push(`'operator3'`);

    const insertSql3 = `INSERT INTO users (${cols3.join(', ')}) VALUES (${values3.join(', ')})`;

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'operator3') THEN
        EXECUTE '${insertSql3.replace(/'/g, "''")}';
      END IF;
    END$$;`);

    // Ensure operator3 links to operator3 endpoint if available
    if (hasSipEndpoint) {
      await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM ps_endpoints WHERE id='operator3') THEN
          UPDATE users SET sip_endpoint_id='operator3'
          WHERE username='operator3' AND (sip_endpoint_id IS NULL OR sip_endpoint_id='');
        END IF;
      END$$;`);
    }

    // Seed operator4 user
    const cols4 = ['username', 'password', 'roles'];
    if (hasIsActive) cols4.push('"isActive"');
    if (hasSipEndpoint) cols4.push('sip_endpoint_id');

    const values4 = [`'operator4'`, `'${passwordHash}'`, `'operator'`];
    if (hasIsActive) values4.push('true');
    if (hasSipEndpoint) values4.push(`'operator4'`);

    const insertSql4 = `INSERT INTO users (${cols4.join(', ')}) VALUES (${values4.join(', ')})`;

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'operator4') THEN
        EXECUTE '${insertSql4.replace(/'/g, "''")}';
      END IF;
    END$$;`);

    // Ensure operator4 links to operator4 endpoint if available
    if (hasSipEndpoint) {
      await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM ps_endpoints WHERE id='operator4') THEN
          UPDATE users SET sip_endpoint_id='operator4'
          WHERE username='operator4' AND (sip_endpoint_id IS NULL OR sip_endpoint_id='');
        END IF;
      END$$;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE username IN ('operator3', 'operator4');`);
  }

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const result = await queryRunner.query(`SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}' LIMIT 1;`);
    return result.length > 0;
  }
}