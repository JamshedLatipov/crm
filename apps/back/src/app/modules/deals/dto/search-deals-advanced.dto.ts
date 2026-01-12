import { IsOptional, IsString } from 'class-validator';
import { BaseAdvancedSearchDto } from '../../shared/dto/universal-filter.dto';

/**
 * DTO for advanced Deal search with universal filters
 */
export class SearchDealsAdvancedDto extends BaseAdvancedSearchDto {
  @IsOptional()
  @IsString()
  status?: string; // For status tab filtering (open, won, lost, all)
}
