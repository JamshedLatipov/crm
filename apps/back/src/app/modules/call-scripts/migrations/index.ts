import { CreateCallScriptsTable1761655735000 } from './1761655735000-CreateCallScriptsTable';
import { CreateCallScriptCategoriesTable1761656938300 } from './1761656938300-CreateCallScriptCategoriesTable';
import { UpdateCallScriptsTableCategory1761656951300 } from './1761656951300-UpdateCallScriptsTableCategory';
import { AddHierarchicalFieldsToCallScripts1762022731300 } from './1762022731300-AddHierarchicalFieldsToCallScripts';
import { SeedCallScriptsDemo1765000000000 } from './1765000000000-SeedCallScriptsDemo';

export const CALL_SCRIPTS_MIGRATIONS = [
  // core schema migrations left commented intentionally
  // CreateCallScriptsTable1761655735000,
  // CreateCallScriptCategoriesTable1761656938300,
  // UpdateCallScriptsTableCategory1761656951300,
  // AddHierarchicalFieldsToCallScripts1762022731300,
  // Seeder migration
  SeedCallScriptsDemo1765000000000,
];