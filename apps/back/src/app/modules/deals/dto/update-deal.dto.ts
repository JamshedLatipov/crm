import { DealStatus } from '../deal.entity';

export class UpdateDealDto {
  title?: string;
  
  // Связи с другими сущностями
  contactId?: string;
  companyId?: string;
  leadId?: number;
  
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  stageId?: string;
  status?: DealStatus;
  assignedTo?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}
