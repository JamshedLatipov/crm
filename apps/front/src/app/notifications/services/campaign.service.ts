import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { Campaign, CreateCampaignDto, CampaignStatus, CampaignType } from '../models/notification.models';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/sms/campaigns';

  // Signals for reactive state
  campaigns = signal<Campaign[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  /**
   * Получить все кампании
   */
  getAll(page = 1, limit = 20, status?: CampaignStatus, type?: CampaignType): Observable<Campaign[]> {

    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }
    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<Campaign[]>(this.apiUrl, { params }).pipe(
      tap({
        next: (response) => {
          const data = response;
          this.campaigns.set(data as Campaign[]);
        },
        error: (error) => {
          this.error.set(error?.message || 'Ошибка загрузки кампаний');
          this.campaigns.set([]);
        },
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  /**
   * Получить кампанию по ID
   */
  getById(id: string): Observable<Campaign> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<Campaign>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.isLoading.set(false),
        error: (error) => {
          this.error.set(error.message || 'Ошибка загрузки кампании');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Создать кампанию
   */
  create(dto: CreateCampaignDto): Observable<Campaign> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<Campaign>(this.apiUrl, dto).pipe(
      tap({
        next: (campaign) => {
          this.campaigns.update((campaigns) => [...campaigns, campaign]);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка создания кампании');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Обновить кампанию
   */
  update(id: string, dto: Partial<CreateCampaignDto>): Observable<Campaign> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.patch<Campaign>(`${this.apiUrl}/${id}`, dto).pipe(
      tap({
        next: (updatedCampaign) => {
          this.campaigns.update((campaigns) =>
            campaigns.map((c) => (c.id === id ? updatedCampaign : c))
          );
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка обновления кампании');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Удалить кампанию
   */
  delete(id: string): Observable<void> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.campaigns.update((campaigns) => campaigns.filter((c) => c.id !== id));
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка удаления кампании');
          this.isLoading.set(false);
        },
      })
    );
  }

  /**
   * Запустить кампанию
   */
  start(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.apiUrl}/${id}/start`, {}).pipe(
      tap({
        next: (updatedCampaign) => {
          this.campaigns.update((campaigns) =>
            campaigns.map((c) => (c.id === id ? updatedCampaign : c))
          );
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка запуска кампании');
        },
      })
    );
  }

  /**
   * Приостановить кампанию
   */
  pause(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.apiUrl}/${id}/pause`, {}).pipe(
      tap({
        next: (updatedCampaign) => {
          this.campaigns.update((campaigns) =>
            campaigns.map((c) => (c.id === id ? updatedCampaign : c))
          );
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка приостановки кампании');
        },
      })
    );
  }

  /**
   * Возобновить кампанию
   */
  resume(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.apiUrl}/${id}/resume`, {}).pipe(
      tap({
        next: (updatedCampaign) => {
          this.campaigns.update((campaigns) =>
            campaigns.map((c) => (c.id === id ? updatedCampaign : c))
          );
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка возобновления кампании');
        },
      })
    );
  }

  /**
   * Отменить кампанию
   */
  cancel(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      tap({
        next: (updatedCampaign) => {
          this.campaigns.update((campaigns) =>
            campaigns.map((c) => (c.id === id ? updatedCampaign : c))
          );
        },
        error: (error) => {
          this.error.set(error.message || 'Ошибка отмены кампании');
        },
      })
    );
  }

  /**
   * Получить статистику кампании
   */
  getStatistics(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/stats`);
  }

  /**
   * Очистить ошибку
   */
  clearError() {
    this.error.set(null);
  }
}
