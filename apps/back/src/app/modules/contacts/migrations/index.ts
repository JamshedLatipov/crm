import { CreateContactsTable1727441100000 } from './1727441100000-CreateContactsTable';
import { SeedTestContacts1727441100001 } from './1727441100001-SeedTestContacts';
import { FixContactActivitiesNullValues1734700000003 } from './1734700000003-FixContactActivitiesNullValues';
import { SeedTestContactActivities1734700000001 } from './1734700000001-SeedTestContactActivities';

export const CONTACTS_MIGRATIONS = [
  CreateContactsTable1727441100000,
  SeedTestContacts1727441100001,
  FixContactActivitiesNullValues1734700000003,
  SeedTestContactActivities1734700000001,
];
