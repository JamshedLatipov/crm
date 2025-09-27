export class UpdateLeadDto {
  title?: string;
  contact?: string;
  stageId?: string | null;
  meta?: Record<string, unknown>;
}
