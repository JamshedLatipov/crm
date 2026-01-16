export class CreateDealDto {
  title: string;
  
  // Связи с другими сущностями (опциональные)
  contactId?: string; // ID контакта
  companyId?: string; // ID компании  
  leadId?: number;    // ID лида
  promoCompanyId?: number; // ID промо-компании (наследуется от лида)
  
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: string;
  stageId: string;
  assignedTo: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}
