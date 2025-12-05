import { SeedAdminUser1691337603000 } from './1691337603000-SeedAdminUser';
import { SeedOperator3And4Users1769999999998 } from './1769999999998-SeedOperator3And4Users';

// Only export seed migrations. Structural/schema migrations are removed from
// the migration lists so migrations are used only for seeding data.
export const USER_MIGRATIONS = [
  // SeedAdminUser1691337603000,
  SeedOperator3And4Users1769999999998,
];
