import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { UniversalFilterDto } from '../dto/universal-filter.dto';

/**
 * Universal service for applying filters to TypeORM query builders
 * Supports both static entity fields and custom JSONB fields
 */
@Injectable()
export class UniversalFilterService {
  /**
   * Apply a single universal filter to the query builder
   * 
   * @param qb - TypeORM SelectQueryBuilder
   * @param filter - Filter configuration
   * @param index - Filter index for unique parameter naming
   * @param entityAlias - Entity alias in query (e.g., 'contact', 'lead', 'deal')
   * @param staticFieldsMap - Map of frontend field names to entity column names
   * @param customFieldsColumn - Name of the JSONB column storing custom fields (default: 'customFields')
   */
  applyFilter<T>(
    qb: SelectQueryBuilder<T>,
    filter: UniversalFilterDto,
    index: number,
    entityAlias: string,
    staticFieldsMap: Record<string, string>,
    customFieldsColumn = 'customFields'
  ): void {
    const paramPrefix = `filter${index}`;

    if (filter.fieldType === 'static') {
      this.applyStaticFieldFilter(qb, filter, paramPrefix, entityAlias, staticFieldsMap);
    } else if (filter.fieldType === 'custom') {
      this.applyCustomFieldFilter(qb, filter, paramPrefix, entityAlias, customFieldsColumn);
    }
  }

  /**
   * Apply filter for static entity fields
   */
  private applyStaticFieldFilter<T>(
    qb: SelectQueryBuilder<T>,
    filter: UniversalFilterDto,
    paramPrefix: string,
    entityAlias: string,
    staticFieldsMap: Record<string, string>
  ): void {
    const { fieldName, operator, value } = filter;

    const columnName = staticFieldsMap[fieldName];
    if (!columnName) {
      console.warn(`Unknown static field: ${fieldName} for entity ${entityAlias}`);
      return;
    }

    this.applyOperator(qb, columnName, operator, value, paramPrefix);
  }

  /**
   * Apply filter for custom fields stored in JSONB
   */
  private applyCustomFieldFilter<T>(
    qb: SelectQueryBuilder<T>,
    filter: UniversalFilterDto,
    paramPrefix: string,
    entityAlias: string,
    customFieldsColumn: string
  ): void {
    const { fieldName, operator, value } = filter;

    // Use double quotes to preserve case sensitivity in PostgreSQL
    const jsonPath = `${entityAlias}."${customFieldsColumn}"->>'${fieldName}'`;

    switch (operator) {
      case 'equals':
        qb.andWhere(`${jsonPath} = :${paramPrefix}`, { [paramPrefix]: String(value) });
        break;
      case 'not_equals':
        qb.andWhere(`${jsonPath} != :${paramPrefix}`, { [paramPrefix]: String(value) });
        break;
      case 'contains':
        qb.andWhere(`${jsonPath} ILIKE :${paramPrefix}`, { [paramPrefix]: `%${value}%` });
        break;
      case 'not_contains':
        qb.andWhere(`${jsonPath} NOT ILIKE :${paramPrefix}`, { [paramPrefix]: `%${value}%` });
        break;
      case 'starts_with':
        qb.andWhere(`${jsonPath} ILIKE :${paramPrefix}`, { [paramPrefix]: `${value}%` });
        break;
      case 'ends_with':
        qb.andWhere(`${jsonPath} ILIKE :${paramPrefix}`, { [paramPrefix]: `%${value}` });
        break;
      case 'greater':
        qb.andWhere(`(${jsonPath})::numeric > :${paramPrefix}`, { [paramPrefix]: value });
        break;
      case 'less':
        qb.andWhere(`(${jsonPath})::numeric < :${paramPrefix}`, { [paramPrefix]: value });
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          qb.andWhere(
            `(${jsonPath})::numeric BETWEEN :${paramPrefix}Start AND :${paramPrefix}End`,
            {
              [`${paramPrefix}Start`]: value[0],
              [`${paramPrefix}End`]: value[1],
            }
          );
        }
        break;
      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          qb.andWhere(`${jsonPath} IN (:...${paramPrefix})`, {
            [paramPrefix]: value.map(v => String(v)),
          });
        }
        break;
      case 'not_in':
        if (Array.isArray(value) && value.length > 0) {
          qb.andWhere(`${jsonPath} NOT IN (:...${paramPrefix})`, {
            [paramPrefix]: value.map(v => String(v)),
          });
        }
        break;
      case 'exists':
        qb.andWhere(`${entityAlias}."${customFieldsColumn}" ? :${paramPrefix}`, {
          [paramPrefix]: fieldName,
        });
        break;
      default:
        console.warn(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Apply operator to a column (used for static fields)
   */
  private applyOperator<T>(
    qb: SelectQueryBuilder<T>,
    columnName: string,
    operator: string,
    value: string | number | boolean | string[] | number[] | undefined,
    paramPrefix: string
  ): void {
    switch (operator) {
      case 'equals':
        qb.andWhere(`${columnName} = :${paramPrefix}`, { [paramPrefix]: value });
        break;
      case 'not_equals':
        qb.andWhere(`${columnName} != :${paramPrefix}`, { [paramPrefix]: value });
        break;
      case 'contains':
        qb.andWhere(`${columnName} ILIKE :${paramPrefix}`, { [paramPrefix]: `%${value}%` });
        break;
      case 'not_contains':
        qb.andWhere(`${columnName} NOT ILIKE :${paramPrefix}`, { [paramPrefix]: `%${value}%` });
        break;
      case 'starts_with':
        qb.andWhere(`${columnName} ILIKE :${paramPrefix}`, { [paramPrefix]: `${value}%` });
        break;
      case 'ends_with':
        qb.andWhere(`${columnName} ILIKE :${paramPrefix}`, { [paramPrefix]: `%${value}` });
        break;
      case 'greater':
        qb.andWhere(`${columnName} > :${paramPrefix}`, { [paramPrefix]: value });
        break;
      case 'less':
        qb.andWhere(`${columnName} < :${paramPrefix}`, { [paramPrefix]: value });
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          qb.andWhere(`${columnName} BETWEEN :${paramPrefix}Start AND :${paramPrefix}End`, {
            [`${paramPrefix}Start`]: value[0],
            [`${paramPrefix}End`]: value[1],
          });
        }
        break;
      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          qb.andWhere(`${columnName} IN (:...${paramPrefix})`, { [paramPrefix]: value });
        }
        break;
      case 'not_in':
        if (Array.isArray(value) && value.length > 0) {
          qb.andWhere(`${columnName} NOT IN (:...${paramPrefix})`, { [paramPrefix]: value });
        }
        break;
      case 'exists':
        qb.andWhere(`${columnName} IS NOT NULL`);
        break;
      default:
        console.warn(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Apply multiple filters to query builder
   */
  applyFilters<T>(
    qb: SelectQueryBuilder<T>,
    filters: UniversalFilterDto[],
    entityAlias: string,
    staticFieldsMap: Record<string, string>,
    customFieldsColumn = 'customFields'
  ): void {
    filters.forEach((filter, index) => {
      this.applyFilter(qb, filter, index, entityAlias, staticFieldsMap, customFieldsColumn);
    });
  }
}
