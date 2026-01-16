import { DealStatus } from '../deal.entity';

export class UpdateDealDto {
  title?: string;
  
  // Связи с другими сущностями
  contactId?: string;
  companyId?: string;
  leadId?: number;
  promoCompanyId?: number; // ID промо-компании
  
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  stageId?: string;
  status?: DealStatus;
  assignedTo?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}
