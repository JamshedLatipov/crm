import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCallScriptsDemo1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure the 'Общие' category exists (some environments may not have it)
    await queryRunner.query(`
      INSERT INTO "call_script_categories" ("id","name","description","color","isActive","sortOrder","createdAt","updatedAt")
      SELECT uuid_generate_v4(), 'Общие', 'Общие скрипты для различных ситуаций', '#2196F3', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM "call_script_categories" WHERE name = 'Общие');
    `);

    // Insert a root script
    await queryRunner.query(`
      INSERT INTO "call_scripts" ("id", "title", "description", "categoryId", "steps", "questions", "tips", "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'Test Script',
        'Demo root script',
        (SELECT id FROM "call_script_categories" WHERE name = 'Общие' LIMIT 1),
        ARRAY['Step 1: Greet customer', 'Step 2: Ask question'],
        ARRAY['Question 1?'],
        ARRAY['Tip 1'],
        true,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);

    // Insert a child referencing the previous root by title
    await queryRunner.query(`
      INSERT INTO "call_scripts" ("id", "title", "description", "categoryId", "steps", "questions", "tips", "isActive", "parentId", "sortOrder", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'Child 1',
        'Demo child script',
        (SELECT id FROM "call_script_categories" WHERE name = 'Общие' LIMIT 1),
        ARRAY['Child step'],
        ARRAY['Child question'],
        ARRAY['Child tip'],
        true,
        (SELECT id FROM "call_scripts" WHERE title = 'Test Script' LIMIT 1),
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);

    // Insert another folder root and its child
    await queryRunner.query(`
      INSERT INTO "call_scripts" ("id", "title", "description", "categoryId", "steps", "questions", "tips", "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'Test Child Folder',
        'Folder root for demo',
        (SELECT id FROM "call_script_categories" WHERE name = 'Общие' LIMIT 1),
        NULL,
        NULL,
        NULL,
        true,
        2,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      INSERT INTO "call_scripts" ("id", "title", "description", "categoryId", "steps", "questions", "tips", "isActive", "parentId", "sortOrder", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'Test Child Document',
        'Child doc inside folder',
        (SELECT id FROM "call_script_categories" WHERE name = 'Общие' LIMIT 1),
        ARRAY['Doc step'],
        ARRAY['Doc question'],
        ARRAY['Doc tip'],
        true,
        (SELECT id FROM "call_scripts" WHERE title = 'Test Child Folder' LIMIT 1),
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "call_scripts" WHERE title IN ('Test Script','Child 1','Test Child Folder','Test Child Document')`);
  }
}
