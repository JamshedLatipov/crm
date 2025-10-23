export class PipelineCreateLeadDto {
  title: string;
  contact?: string;
  stageId?: string;
  meta?: Record<string, unknown>;
}
