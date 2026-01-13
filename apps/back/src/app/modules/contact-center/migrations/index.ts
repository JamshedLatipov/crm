import { CreateAgentStatusHistoryTable1735675200000 } from './1735675200000-CreateAgentStatusHistoryTable';
import { MigrateExistingAgentStatuses1735675201000 } from './1735675201000-MigrateExistingAgentStatuses';
import { RemoveCampaignSegmentsTable1768315638000 } from './1768315638000-RemoveCampaignSegmentsTable';
// import { CreateOutboundCampaignsTables1736780000000 } from './1736780000000-CreateOutboundCampaignsTables';

export const CONTACT_CENTER_MIGRATIONS = [
  CreateAgentStatusHistoryTable1735675200000,
  MigrateExistingAgentStatuses1735675201000,
  // RemoveCampaignSegmentsTable1768315638000,
  // CreateOutboundCampaignsTables1736780000000,
];
