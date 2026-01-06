import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  TelegramTemplate,
  CreateTelegramTemplateDto,
} from '../models/notification.models';
import { PaginatedResponse } from '../../shared/types/common.types';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TelegramTemplateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/messages/telegram/templates';

  // Signals for reactive state
  templates = signal<TelegramTemplate[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  /**
   * Получить все Telegram шаблоны
   */
  getAll(page = 1, limit = 20, category?: string, isActive?: boolean): Observable<PaginatedResponse<TelegramTemplate>> {
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

    return this.http.get<PaginatedResponse<TelegramTemplate>>(this.apiUrl, { params }).pipe(
      tap({
        next: (response) => {
          this.templates.set(response.data);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка загрузки шаблонов Telegram');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Получить шаблон по ID
   */
  getById(id: string): Observable<TelegramTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<TelegramTemplate>(`${this.apiUrl}/${id}`).pipe(
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
  create(dto: CreateTelegramTemplateDto): Observable<TelegramTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<TelegramTemplate>(this.apiUrl, dto).pipe(
      tap({
        next: () => this.isLoading.set(false),
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
  update(id: string, dto: Partial<CreateTelegramTemplateDto>): Observable<TelegramTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.patch<TelegramTemplate>(`${this.apiUrl}/${id}`, dto).pipe(
      tap({
        next: () => this.isLoading.set(false),
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
          // Удаляем из локального состояния
          this.templates.update(templates => templates.filter(t => t.id !== id));
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
   * Активировать/деактивировать шаблон
   */
  toggleActive(id: string, isActive: boolean): Observable<TelegramTemplate> {
    return this.update(id, { isActive });
  }

  /**
   * Отправить тестовое сообщение
   */
  sendTest(id: string, chatId: string, variables?: Record<string, any>): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post(`${this.apiUrl}/${id}/test`, { chatId, variables }).pipe(
      tap({
        next: () => this.isLoading.set(false),
        error: (error) => {
          this.error.set(error.message || 'Ошибка отправки тестового сообщения');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Получить статистику шаблона
   */
  getStats(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/stats`);
  }

  /**
   * Очистить ошибку
   */
  clearError(): void {
    this.error.set(null);
  }
}
