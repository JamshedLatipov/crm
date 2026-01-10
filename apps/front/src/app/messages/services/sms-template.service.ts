import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  SmsTemplate,
  CreateSmsTemplateDto,
} from '../models/message.models';
import { PaginatedResponse } from '../../shared/types/common.types';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SmsTemplateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/messages/sms/templates';

  // Signals for reactive state
  templates = signal<SmsTemplate[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  /**
   * Получить все SMS шаблоны
   */
  getAll(page = 1, limit = 20, category?: string, isActive?: boolean): Observable<PaginatedResponse<SmsTemplate>> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (category) {
      params = params.set('category', category);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<PaginatedResponse<SmsTemplate>>(this.apiUrl, { params }).pipe(
      tap({
        next: (response) => {
          this.templates.set(response.data);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка загрузки шаблонов');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Получить шаблон по ID
   */
  getById(id: string): Observable<SmsTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<SmsTemplate>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.isLoading.set(false),
        error: (error) => {
          this.error.set(error.message || 'Ошибка загрузки шаблона');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Создать шаблон
   */
  create(dto: CreateSmsTemplateDto): Observable<SmsTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<SmsTemplate>(this.apiUrl, dto).pipe(
      tap({
        next: (template) => {
          this.templates.update((templates) => [...templates, template]);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка создания шаблона');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Обновить шаблон
   */
  update(id: string, dto: Partial<CreateSmsTemplateDto>): Observable<SmsTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<SmsTemplate>(`${this.apiUrl}/${id}`, dto).pipe(
      tap({
        next: (updatedTemplate) => {
          this.templates.update((templates) =>
            templates.map((t) => (t.id === id ? updatedTemplate : t))
          );
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка обновления шаблона');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Удалить шаблон
   */
  delete(id: string): Observable<void> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.templates.update((templates) => templates.filter((t) => t.id !== id));
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка удаления шаблона');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Дублировать шаблон
   */
  duplicate(id: string): Observable<SmsTemplate> {
    return this.http.post<SmsTemplate>(`${this.apiUrl}/${id}/duplicate`, {}).pipe(
      tap({
        next: (newTemplate) => {
          this.templates.update((templates) => [...templates, newTemplate]);
        },
      })
    );
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

  /**
   * Очистить ошибку
   */
  clearError() {
    this.error.set(null);
  }
}
