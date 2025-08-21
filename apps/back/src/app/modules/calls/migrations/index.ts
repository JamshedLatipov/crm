import { CreateCdrTable1691337600000 } from './1691337600000-CreateCdrTable';
import { CreatePjsipRealtimeTables1691337600001 } from './1691337600001-CreatePjsipRealtimeTables';
import { DropUnusedTables1691337600002 } from '../migrations/1691337600002-DropUnusedTables';
import { AddMicroSipAccount1691337600004 } from './1691337600004-AddMicroSipAccount';
import { AddWebRtcOperator11691337601001 } from './1691337601001-AddWebRtcOperator1';
import { AddWebRtcOperator21691337601002 } from './1691337601002-AddWebRtcOperator2';
import { CreateQueuesTables1691337603000 } from './1691337603000-CreateQueuesTables';

export const CALLS_MIGRATIONS = [
  CreateCdrTable1691337600000,
  CreatePjsipRealtimeTables1691337600001,
  DropUnusedTables1691337600002,
  AddMicroSipAccount1691337600004,
  // WebRTC operators migrations
  AddWebRtcOperator11691337601001,
  AddWebRtcOperator21691337601002,
  // Queues
  CreateQueuesTables1691337603000,
];
