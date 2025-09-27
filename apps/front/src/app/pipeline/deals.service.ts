import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Deal, CreateDealDto, UpdateDealDto, DealStatus } from './dtos';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DealsService {
  private readonly apiUrl = environment.apiBase + '/deals';
  private readonly http = inject(HttpClient);

  // === CRUD операции ===
  listDeals(): Observable<Deal[]> {
    return this.http.get<Deal[]>(this.apiUrl);
  }

  getDealById(id: string): Observable<Deal> {
    return this.http.get<Deal>(`${this.apiUrl}/${id}`);
  }

  createDeal(dto: CreateDealDto): Observable<Deal> {
    return this.http.post<Deal>(this.apiUrl, dto);
  }

  updateDeal(id: string, dto: UpdateDealDto): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${id}`, dto);
  }

  deleteDeal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // === Специфичные операции для сделок ===
  
  // Перемещение сделки по этапам воронки
  moveToStage(id: string, stageId: string): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${id}/move-stage`, { stageId });
  }

  // Закрытие сделки как выигранной
  winDeal(id: string, actualAmount?: number): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${id}/win`, { 
      status: DealStatus.WON,
      actualCloseDate: new Date(),
      ...(actualAmount && { amount: actualAmount })
    });
  }

  // Закрытие сделки как проигранной
  loseDeal(id: string, reason: string): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${id}/lose`, { 
      status: DealStatus.LOST,
      actualCloseDate: new Date(),
      notes: reason 
    });
  }

  // Обновление вероятности закрытия
  updateProbability(id: string, probability: number): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${id}/probability`, { probability });
  }

  // Назначение сделки менеджеру
  assignDeal(id: string, managerId: string): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${id}/assign`, { assignedTo: managerId });
  }

  // Фильтрация сделок
  getDealsByStage(stageId: string): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}?stageId=${stageId}`);
  }

  getDealsByStatus(status: DealStatus): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}?status=${status}`);
  }

  getDealsByManager(managerId: string): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}?assignedTo=${managerId}`);
  }

  // Сделки с истекающим сроком
  getOverdueDeals(): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}/overdue`);
  }

  // Прогноз продаж
  getSalesForecast(period: 'month' | 'quarter' | 'year'): Observable<{
    period: string;
    totalAmount: number;
    weightedAmount: number; // с учетом вероятности
    dealsCount: number;
  }> {
    return this.http.get<{
      period: string;
      totalAmount: number;
      weightedAmount: number;
      dealsCount: number;
    }>(`${this.apiUrl}/forecast?period=${period}`);
  }

  // Поиск сделок
  searchDeals(query: string): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }
}
