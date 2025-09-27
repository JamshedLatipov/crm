export class ContactDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

export class CreateDealDto {
  title: string;
  leadId?: string;
  contactId?: string; // Предпочтительный способ - ссылка на существующий контакт
  contact?: ContactDto; // Deprecated - используйте contactId
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: string;
  stageId: string;
  assignedTo: string;
  notes?: string;
  meta?: Record<string, unknown>;
}
