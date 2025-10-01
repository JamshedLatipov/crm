import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Deal, 
  CreateDealDto, 
  UpdateDealDto, 
  DealStatus,
  DealHistoryFilters,
  DealHistoryResponse,
  DealHistoryStats,
  UserActivityStats,
  StageMovementStats,
  MostActiveDeal
} from './dtos';
import { environment } from '../../environments/environment';

export interface DealAssignment {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  assignedBy: number;
  assignedAt: Date;
  reason?: string;
}

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

  // Получение текущих назначений сделки
  getCurrentAssignments(dealId: string): Observable<DealAssignment[]> {
    return this.http.get<DealAssignment[]>(`${this.apiUrl}/${dealId}/assignments`);
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

  // === Работа со связями с другими сущностями ===
  
  // Привязка сделки к компании
  linkToCompany(dealId: string, companyId: string): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${dealId}/link-company`, { companyId });
  }

  // Привязка сделки к контакту
  linkToContact(dealId: string, contactId: string): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${dealId}/link-contact`, { contactId });
  }

  // Привязка сделки к лиду
  linkToLead(dealId: string, leadId: number): Observable<Deal> {
    return this.http.patch<Deal>(`${this.apiUrl}/${dealId}/link-lead`, { leadId });
  }

  // Получение сделок по компании
  getDealsByCompany(companyId: string): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}/by-company/${companyId}`);
  }

  // Получение сделок по контакту
  getDealsByContact(contactId: string): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}/by-contact/${contactId}`);
  }

  // Получение сделок по лиду
  getDealsByLead(leadId: number): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.apiUrl}/by-lead/${leadId}`);
  }

  // === МЕТОДЫ ИСТОРИИ СДЕЛОК ===
  
  // Получение истории конкретной сделки
  getDealHistory(
    dealId: string, 
    filters?: DealHistoryFilters, 
    page = 1, 
    limit = 50
  ): Observable<DealHistoryResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.changeType?.length) {
        params = params.set('changeType', filters.changeType.join(','));
      }
      if (filters.userId?.length) {
        params = params.set('userId', filters.userId.join(','));
      }
      if (filters.fieldName?.length) {
        params = params.set('fieldName', filters.fieldName.join(','));
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo.toISOString());
      }
    }

    return this.http.get<DealHistoryResponse>(`${this.apiUrl}/${dealId}/history`, { params });
  }

  // Получение статистики изменений сделки
  getDealHistoryStats(
    dealId: string, 
    dateFrom?: Date, 
    dateTo?: Date
  ): Observable<DealHistoryStats> {
    let params = new HttpParams();
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom.toISOString());
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo.toISOString());
    }

    return this.http.get<DealHistoryStats>(`${this.apiUrl}/${dealId}/history/stats`, { params });
  }

  // Получение последних изменений по всем сделкам
  getRecentChanges(
    filters?: DealHistoryFilters, 
    page = 1, 
    limit = 20
  ): Observable<DealHistoryResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.changeType?.length) {
        params = params.set('changeType', filters.changeType.join(','));
      }
      if (filters.userId?.length) {
        params = params.set('userId', filters.userId.join(','));
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo.toISOString());
      }
    }

    return this.http.get<DealHistoryResponse>(`${this.apiUrl}/history/recent`, { params });
  }

  // Получение общей статистики изменений
  getHistoryStats(dateFrom?: Date, dateTo?: Date): Observable<DealHistoryStats> {
    let params = new HttpParams();
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom.toISOString());
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo.toISOString());
    }

    return this.http.get<DealHistoryStats>(`${this.apiUrl}/history/stats`, { params });
  }

  // Получение активности пользователей
  getUserActivity(
    dateFrom?: Date, 
    dateTo?: Date, 
    limit = 10
  ): Observable<UserActivityStats[]> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom.toISOString());
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo.toISOString());
    }

    return this.http.get<UserActivityStats[]>(`${this.apiUrl}/history/user-activity`, { params });
  }

  // Получение статистики движения по этапам
  getStageMovementStats(dateFrom?: Date, dateTo?: Date): Observable<StageMovementStats[]> {
    let params = new HttpParams();
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom.toISOString());
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo.toISOString());
    }

    return this.http.get<StageMovementStats[]>(`${this.apiUrl}/history/stage-movement`, { params });
  }

  // Получение самых активных сделок
  getMostActiveDeals(
    limit = 10, 
    dateFrom?: Date, 
    dateTo?: Date
  ): Observable<MostActiveDeal[]> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom.toISOString());
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo.toISOString());
    }

    return this.http.get<MostActiveDeal[]>(`${this.apiUrl}/history/most-active-deals`, { params });
  }
}
