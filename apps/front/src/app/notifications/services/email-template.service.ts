import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmailTemplate,
  CreateEmailTemplateDto,
} from '../models/notification.models';
import { PaginatedResponse } from '../../shared/types/common.types';
import { environment } from '@crm/front/environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class EmailTemplateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/email-templates';

  /**
   * Получить все Email шаблоны
   */
  getAll(page = 1, limit = 20, category?: string, isActive?: boolean): Observable<PaginatedResponse<EmailTemplate>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (category) {
      params = params.set('category', category);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<PaginatedResponse<EmailTemplate>>(this.apiUrl, { params });
  }

  /**
   * Получить шаблон по ID
   */
  getById(id: string): Observable<EmailTemplate> {
    return this.http.get<EmailTemplate>(`${this.apiUrl}/${id}`);
  }

  /**
   * Создать шаблон
   */
  create(dto: CreateEmailTemplateDto): Observable<EmailTemplate> {
    return this.http.post<EmailTemplate>(this.apiUrl, dto);
  }

  /**
   * Обновить шаблон
   */
  update(id: string, dto: Partial<CreateEmailTemplateDto>): Observable<EmailTemplate> {
    return this.http.put<EmailTemplate>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Удалить шаблон
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Дублировать шаблон
   */
  duplicate(id: string): Observable<EmailTemplate> {
    return this.http.post<EmailTemplate>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  /**
   * Рендеринг шаблона (предпросмотр)
   */
  render(id: string, variables: Record<string, any>): Observable<{ subject: string; html: string; text: string }> {
    return this.http.post<{ subject: string; html: string; text: string }>(`${this.apiUrl}/${id}/render`, { variables });
  }

  /**
   * Валидировать HTML шаблон
   */
  validate(htmlContent: string): Observable<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return this.http.post<{ isValid: boolean; errors: string[]; warnings: string[] }>(`${this.apiUrl}/validate`, { htmlContent });
  }

  /**
   * Получить статистику шаблона
   */
  getStatistics(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/statistics`);
  }
}
