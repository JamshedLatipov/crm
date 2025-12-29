import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Segment, CreateSegmentDto } from '../models/notification.models';
import { PaginatedResponse } from '../../shared/types/common.types';
import { environment } from '@crm/front/environments/environment';

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
   * Получить все сегменты с пагинацией
   */
  getAll(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    this.isLoading.set(true);
    return this.http.get<PaginatedResponse<Segment>>(this.apiUrl, { params }).pipe(
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
    return this.http.post<Segment>(this.apiUrl, dto);
  }

  /**
   * Обновить сегмент
   */
  update(id: string, dto: Partial<CreateSegmentDto>): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Удалить сегмент
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Дублировать сегмент
   */
  duplicate(id: string): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  /**
   * Обновить счётчик контактов в сегменте
   */
  refreshContactCount(id: string): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.apiUrl}/${id}/refresh`, {});
  }

  /**
   * Получить контакты сегмента с пагинацией
   */
  getContacts(id: string, page = 1, limit = 20): Observable<PaginatedResponse<any>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/${id}/contacts`, { params });
  }

  /**
   * Экспорт контактов сегмента
   */
  exportContacts(id: string, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
  }
}
