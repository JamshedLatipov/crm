import { UniversalFilter } from '../shared/interfaces/universal-filter.interface';

/**
 * Filter state for Deals list
 */
export interface DealsFilterState {
  search?: string;
  filters: UniversalFilter[];
  status?: string; // For status tab: 'all', 'open', 'won', 'lost'
}
