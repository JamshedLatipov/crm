import { BaseFilterState } from '../shared/interfaces/universal-filter.interface';

export interface CompaniesFilterState extends BaseFilterState {
  status?: string; // 'all' | 'active' | 'inactive' | 'blacklisted'
}
