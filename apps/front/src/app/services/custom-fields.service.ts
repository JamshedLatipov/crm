import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CustomFieldDefinition,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  EntityType,
} from '../models/custom-field.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustomFieldsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBase}/custom-fields`;

  create(dto: CreateCustomFieldDto): Observable<CustomFieldDefinition> {
    return this.http.post<CustomFieldDefinition>(this.apiUrl, dto);
  }

  findAll(entityType?: EntityType): Observable<CustomFieldDefinition[]> {
    let params = new HttpParams();
    if (entityType) {
      params = params.set('entityType', entityType);
    }
    return this.http.get<CustomFieldDefinition[]>(this.apiUrl, { params });
  }

  findByEntity(entityType: EntityType): Observable<CustomFieldDefinition[]> {
    return this.http.get<CustomFieldDefinition[]>(
      `${this.apiUrl}/entity/${entityType}`
    );
  }

  findOne(id: string): Observable<CustomFieldDefinition> {
    return this.http.get<CustomFieldDefinition>(`${this.apiUrl}/${id}`);
  }

  update(
    id: string,
    dto: UpdateCustomFieldDto
  ): Observable<CustomFieldDefinition> {
    return this.http.put<CustomFieldDefinition>(`${this.apiUrl}/${id}`, dto);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  updateSortOrder(
    updates: Array<{ id: string; sortOrder: number }>
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/sort-order`,
      updates
    );
  }

  validate(
    entityType: EntityType,
    customFields: Record<string, any>
  ): Observable<{ isValid: boolean; errors: Record<string, string[]> }> {
    return this.http.post<{
      isValid: boolean;
      errors: Record<string, string[]>;
    }>(`${this.apiUrl}/validate`, { entityType, customFields });
  }
}
