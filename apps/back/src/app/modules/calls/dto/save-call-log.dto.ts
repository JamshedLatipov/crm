export class SaveCallLogDto {
  callId?: string | null;
  clientCallId?: string | null;
  sipCallId?: string | null;
  note?: string | null;
  callType?: string | null;
  scriptBranch?: string | null;
  duration?: number | null;
  disposition?: string | null;
}
