export class CreateLeadDto {
  title: string;
  contact?: string;
  stageId?: string;
  meta?: Record<string, unknown>;
}
