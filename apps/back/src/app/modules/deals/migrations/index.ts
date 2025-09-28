import { CreateDealsTable1727441000000 } from './1727441000000-CreateDealsTable';
import { AddStageTypeColumn1727441000001 } from './1727441000001-AddStageTypeColumn';
import { SeedTestDeals1727441000002 } from './1727441000002-SeedTestDeals';
import { AddContactIdToDeals1727441100002 } from './1727441100002-AddContactIdToDeals';
import { FixContactIdMigration1727441100003 } from './1727441100003-FixContactIdMigration';
import { RemoveDeprecatedDealFields1727441300000 } from './1727441300000-RemoveDeprecatedDealFields';

export const DEALS_MIGRATIONS = [
  CreateDealsTable1727441000000,
  AddStageTypeColumn1727441000001,
  SeedTestDeals1727441000002,
  AddContactIdToDeals1727441100002,
  FixContactIdMigration1727441100003,
  RemoveDeprecatedDealFields1727441300000,
];
