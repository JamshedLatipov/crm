import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@crm/front/environments/environment';
import {
  Segment,
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentContact,
  PhoneNumber,
  Email,
  SegmentUsageType
} from '../models/segment.models';
import { PaginatedResponse } from '../types/common.types';

/**
 * Universal Segment Service
 * Используется для работы с сегментами всех типов (SMS, Email, WhatsApp, Telegram, Campaigns)
 */
@Injectable({
  providedIn: 'root',
})
export class SegmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/segments';

  // Signals для реактивного состояния
  segments = signal<Segment[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  /**
   * Получить все сегменты с пагинацией и фильтрацией
   */
  getAll(params?: {
    page?: number;
    limit?: number;
    usageType?: SegmentUsageType;
    isActive?: boolean;
    search?: string;
  }): Observable<PaginatedResponse<Segment>> {
    let httpParams = new HttpParams()
      .set('page', (params?.page || 1).toString())
      .set('limit', (params?.limit || 20).toString());

    if (params?.usageType) {
      httpParams = httpParams.set('usageType', params.usageType);
    }

    if (params?.isActive !== undefined) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    this.isLoading.set(true);
    return this.http.get<PaginatedResponse<Segment>>(this.apiUrl, { params: httpParams }).pipe(
      tap({
        next: (response) => {
          this.segments.set(response.data);
          this.isLoading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err.message || 'Ошибка загрузки сегментов');
        }
      })
    );
  }

  /**
   * Получить сегмент по ID
   */
  getById(id: string): Observable<Segment> {
    return this.http.get<Segment>(`${this.apiUrl}/${id}`);
  }

  /**
   * Создать сегмент
   */
  create(dto: CreateSegmentDto): Observable<Segment> {
    return this.http.post<Segment>(this.apiUrl, dto).pipe(
      tap({
        next: (segment) => {
          // Добавляем в локальное состояние
          this.segments.update(segments => [segment, ...segments]);
        }
      })
    );
  }

  /**
   * Обновить сегмент
   */
  update(id: string, dto: UpdateSegmentDto): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/${id}`, dto).pipe(
      tap({
        next: (updatedSegment) => {
          // Обновляем в локальном состоянии
          this.segments.update(segments => 
            segments.map(s => s.id === id ? updatedSegment : s)
          );
        }
      })
    );
  }

  /**
   * Удалить сегмент
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          // Удаляем из локального состояния
          this.segments.update(segments => segments.filter(s => s.id !== id));
        }
      })
    );
  }

  /**
   * Дублировать сегмент
   */
  duplicate(id: string): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/${id}/duplicate`, {}).pipe(
      tap({
        next: (duplicatedSegment) => {
          // Добавляем в локальное состояние
          this.segments.update(segments => [duplicatedSegment, ...segments]);
        }
      })
    );
  }

  /**
   * Пересчитать количество контактов в сегменте
   */
  recalculate(id: string): Observable<{ contactsCount: number }> {
    return this.http.post<{ contactsCount: number }>(`${this.apiUrl}/${id}/recalculate`, {});
  }

  /**
   * Получить контакты сегмента с пагинацией
   */
  getContacts(id: string, page = 1, limit = 20): Observable<PaginatedResponse<SegmentContact>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<SegmentContact>>(`${this.apiUrl}/${id}/contacts`, { params });
  }

  /**
   * Получить номера телефонов из сегмента (для SMS/звонков)
   */
  getPhoneNumbers(id: string): Observable<PhoneNumber[]> {
    return this.http.get<PhoneNumber[]>(`${this.apiUrl}/${id}/phone-numbers`);
  }

  /**
   * Получить email адреса из сегмента (для email рассылок)
   */
  getEmails(id: string): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.apiUrl}/${id}/emails`);
  }

  /**
   * Предпросмотр количества контактов для фильтров (без сохранения сегмента)
   */
  preview(filters: any[], filterLogic: 'AND' | 'OR' = 'AND'): Observable<{ count: number; contacts: SegmentContact[] }> {
    return this.http.post<{ count: number; contacts: SegmentContact[] }>(
      `${this.apiUrl}/preview`,
      { filters, filterLogic }
    );
  }

  /**
   * Экспорт контактов сегмента
   */
  exportContacts(id: string, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
  }

  /**
   * Получить SMS сегменты (обратная совместимость)
   */
  getSmsSegments(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    return this.getAll({
      page,
      limit,
      usageType: SegmentUsageType.SMS,
      isActive
    });
  }

  /**
   * Получить Campaign сегменты (для контакт-центра)
   */
  getCampaignSegments(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    return this.getAll({
      page,
      limit,
      usageType: SegmentUsageType.CAMPAIGN,
      isActive
    });
  }

  /**
   * Получить Email сегменты
   */
  getEmailSegments(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    return this.getAll({
      page,
      limit,
      usageType: SegmentUsageType.EMAIL,
      isActive
    });
  }

  /**
   * Получить WhatsApp сегменты
   */
  getWhatsAppSegments(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    return this.getAll({
      page,
      limit,
      usageType: SegmentUsageType.WHATSAPP,
      isActive
    });
  }

  /**
   * Получить Telegram сегменты
   */
  getTelegramSegments(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    return this.getAll({
      page,
      limit,
      usageType: SegmentUsageType.TELEGRAM,
      isActive
    });
  }

  /**
   * Очистить локальное состояние
   */
  clearState(): void {
    this.segments.set([]);
    this.isLoading.set(false);
    this.error.set(null);
  }
}
