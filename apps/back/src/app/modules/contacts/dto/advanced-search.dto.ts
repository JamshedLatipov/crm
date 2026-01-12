import { BaseAdvancedSearchDto } from '../../shared/dto/universal-filter.dto';

/**
 * DTO for contacts advanced search
 * Extends base DTO with universal filter support
 */
export class AdvancedSearchDto extends BaseAdvancedSearchDto {
  // Can add contact-specific search parameters here if needed
}

// Re-export for convenience
export { UniversalFilterDto } from '../../shared/dto/universal-filter.dto';
