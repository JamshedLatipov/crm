import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureSeedSystemUser1740000000005 implements MigrationInterface {
  name = 'EnsureSeedSystemUser1740000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a fallback system user with id=37 if it doesn't exist to satisfy FK references
    // Uses the same demo password hash used by presentation seed
    const passwordHash = '$2b$10$h21TvWmjh3vy6miKYtIp7e3bjAv6JZ7fiYYZZ8G2yBrux21UZw3Vu';

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE id = 37) THEN
        INSERT INTO users (id, username, password, roles, "isActive", "createdAt", "updatedAt")
        VALUES (37, 'seed.system', '${passwordHash}', 'admin', true, now(), now());
      END IF;

      -- Ensure users_id_seq (serial) is ahead of manually inserted id to avoid collisions
      PERFORM setval(pg_get_serial_sequence('users','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM users), 38));
    END$$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE id = 37 AND username = 'seed.system'`);
  }
}
