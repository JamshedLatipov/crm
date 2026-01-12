import { IsOptional, IsString } from 'class-validator';
import { BaseAdvancedSearchDto } from '../../shared/dto/universal-filter.dto';

export class SearchCompaniesAdvancedDto extends BaseAdvancedSearchDto {
  @IsOptional()
  @IsString()
  status?: string; // For status tab filtering (e.g., 'all', 'active', 'inactive', 'blacklisted')
}
