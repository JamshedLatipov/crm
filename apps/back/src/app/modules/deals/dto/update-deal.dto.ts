import { DealStatus } from '../deal.entity';
import { ContactDto } from './create-deal.dto';

export class UpdateDealDto {
  title?: string;
  contactId?: string;
  contact?: Partial<ContactDto>;
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
