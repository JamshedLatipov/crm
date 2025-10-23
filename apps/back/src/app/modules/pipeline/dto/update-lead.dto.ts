export class PipelineUpdateLeadDto {
  title?: string;
  contact?: string;
  stageId?: string | null;
  meta?: Record<string, unknown>;
}
