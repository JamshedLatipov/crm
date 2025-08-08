import { CreateCdrTable1691337600000 } from "./1691337600000-CreateCdrTable";
import { CreatePjsipRealtimeTables1691337600001 } from "./1691337600001-CreatePjsipRealtimeTables";
import { DropUnusedTables1691337600002 } from "../migrations/1691337600002-DropUnusedTables";

export const CALLS_MIGRATIONS = [
    CreateCdrTable1691337600000,
    CreatePjsipRealtimeTables1691337600001,
    DropUnusedTables1691337600002,
];