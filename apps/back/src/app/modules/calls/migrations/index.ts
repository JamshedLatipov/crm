import { CreatePjsipRealtimeTables1691337600001 } from "./1691337600001-CreatePjsipRealtimeTables";
import { AddMicroSipAccount1691337600004 } from "./1691337600004-AddMicroSipAccount";
import { AddWebRtcOperator11691337601001 } from "./1691337601001-AddWebRtcOperator1";
import { AddWebRtcOperator21691337601002 } from "./1691337601002-AddWebRtcOperator2";
import { AddWebRtcOperator31691337601003 } from "./1691337601003-AddSipOperator1";
import { AddWebRtcOperator41691337601004 } from "./1691337601004-AddSipOperator2";
import { CreateSupportQueueAndMembers1769999999999 } from "./1769999999999-CreateSupportQueueAndMembers";
import { EnsurePjsipRecords1770000000000 } from "./1770000000000-EnsurePjsipRecords";
import { AddFromDomainToPsEndpoints1770000000001 } from "./1770000000001-AddFromDomainToPsEndpoints";

// Include PJSIP realtime table creation and MicroSIP seed so `ps_` tables
// are created/populated by migrationsRun in the container runtime.
export const CALLS_MIGRATIONS = [
	CreatePjsipRealtimeTables1691337600001,
	AddMicroSipAccount1691337600004,
	AddWebRtcOperator21691337601002,
	AddWebRtcOperator11691337601001,
	AddWebRtcOperator31691337601003,
	AddWebRtcOperator41691337601004,
	EnsurePjsipRecords1770000000000,
	CreateSupportQueueAndMembers1769999999999,
	AddFromDomainToPsEndpoints1770000000001,
];
