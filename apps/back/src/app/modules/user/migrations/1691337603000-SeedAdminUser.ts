import { MigrationInterface, QueryRunner } from 'typeorm';

// Seeds initial admin user (username: admin, password: admin123)
export class SeedAdminUser1691337603000 implements MigrationInterface {
  name = 'SeedAdminUser1691337603000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = '$2b$10$h21TvWmjh3vy6miKYtIp7e3bjAv6JZ7fiYYZZ8G2yBrux21UZw3Vu';
    const hasSnakeIsActive = await this.columnExists(queryRunner, 'users', 'is_active');
    const hasCamelIsActive = await this.columnExists(queryRunner, 'users', 'isActive');
    const hasSipEndpoint = await this.columnExists(queryRunner, 'users', 'sip_endpoint_id');

    const isActiveCol = hasSnakeIsActive ? 'is_active' : (hasCamelIsActive ? '"isActive"' : null);
    const cols = ['username', 'password', 'roles'];
    if (isActiveCol) cols.push(isActiveCol);
    if (hasSipEndpoint) cols.push('sip_endpoint_id');

    const valuesParts = [`'admin'`, `'${passwordHash}'`, `'admin'`];
    if (isActiveCol) valuesParts.push('true');
  if (hasSipEndpoint) valuesParts.push(`'operator1'`);

    const insertSql = `INSERT INTO users (${cols.join(', ')}) VALUES (${valuesParts.join(', ')})`;

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        EXECUTE '${insertSql.replace(/'/g, "''")}';
      END IF;
    END$$;`);

    // If user already existed from previous runs without endpoint, attach operator1 if available
    if (hasSipEndpoint) {
      await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM ps_endpoints WHERE id='operator1') THEN
          UPDATE users SET sip_endpoint_id='operator1'
          WHERE username='admin' AND (sip_endpoint_id IS NULL OR sip_endpoint_id='');
        END IF;
      END$$;`);
    }

    // Seed a test operator user 'operator2' and attach sip_endpoint_id='operator2' when available
    const opCols = ['username', 'password', 'roles'];
    if (isActiveCol) opCols.push(isActiveCol);
    if (hasSipEndpoint) opCols.push('sip_endpoint_id');

    const opValues = [`'operator2'`, `'${passwordHash}'`, `'operator'`];
    if (isActiveCol) opValues.push('true');
    if (hasSipEndpoint) opValues.push(`'operator2'`);

    const insertOpSql = `INSERT INTO users (${opCols.join(', ')}) VALUES (${opValues.join(', ')})`;
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'operator2') THEN
        EXECUTE '${insertOpSql.replace(/'/g, "''")}';
      END IF;
    END$$;`);

    // If ps_endpoint 'operator2' exists, ensure user links to it
    if (hasSipEndpoint) {
      await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM ps_endpoints WHERE id='operator2') THEN
          UPDATE users SET sip_endpoint_id='operator2'
          WHERE username='operator2' AND (sip_endpoint_id IS NULL OR sip_endpoint_id='');
        END IF;
      END$$;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE username = 'admin';`);
  }

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const result = await queryRunner.query(`SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}' LIMIT 1;`);
    return result.length > 0;
  }
}
