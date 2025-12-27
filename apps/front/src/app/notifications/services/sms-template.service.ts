import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SmsTemplate,
  CreateSmsTemplateDto,
  PaginatedResponse,
} from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class SmsTemplateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/sms/templates';

  /**
   * Получить все SMS шаблоны
   */
  getAll(page = 1, limit = 20, category?: string, isActive?: boolean): Observable<PaginatedResponse<SmsTemplate>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (category) {
      params = params.set('category', category);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<PaginatedResponse<SmsTemplate>>(this.apiUrl, { params });
  }

  /**
   * Получить шаблон по ID
   */
  getById(id: string): Observable<SmsTemplate> {
    return this.http.get<SmsTemplate>(`${this.apiUrl}/${id}`);
  }

  /**
   * Создать шаблон
   */
  create(dto: CreateSmsTemplateDto): Observable<SmsTemplate> {
    return this.http.post<SmsTemplate>(this.apiUrl, dto);
  }

  /**
   * Обновить шаблон
   */
  update(id: string, dto: Partial<CreateSmsTemplateDto>): Observable<SmsTemplate> {
    return this.http.put<SmsTemplate>(`${this.apiUrl}/${id}`, dto);
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
  duplicate(id: string): Observable<SmsTemplate> {
    return this.http.post<SmsTemplate>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  /**
   * Валидировать шаблон
   */
  validate(content: string): Observable<{ isValid: boolean; errors: string[] }> {
    return this.http.post<{ isValid: boolean; errors: string[] }>(`${this.apiUrl}/validate`, { content });
  }

  /**
   * Тестовая отправка
   */
  sendTest(templateId: string, phoneNumber: string, variables?: Record<string, any>): Observable<any> {
    return this.http.post(`${this.apiUrl}/test`, { templateId, phoneNumber, variables });
  }

  /**
   * Получить популярные шаблоны
   */
  getPopular(limit = 10): Observable<SmsTemplate[]> {
    return this.http.get<SmsTemplate[]>(`${this.apiUrl}/popular`, {
      params: { limit: limit.toString() },
    });
  }
}
