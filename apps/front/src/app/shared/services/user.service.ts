import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { mapBackendToManager } from './user.mappers';
import { environment } from '../../../environments/environment';

export interface Manager {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  roles: string[];
  currentLeadsCount: number;
  maxLeadsCapacity: number;
  // Deals workload
  currentDealsCount: number;
  maxDealsCapacity: number;
  // Tasks workload
  currentTasksCount: number;
  maxTasksCapacity: number;
  conversionRate: number;
  isAvailableForAssignment: boolean;
  fullName: string;
  workloadPercentage: number;
  isOverloaded: boolean;
  skills: string[];
  territories: string[];
}

export interface ManagerStats {
  totalManagers: number;
  availableManagers: number;
  overloadedManagers: number;
  averageWorkload: number;
  topPerformers: Array<{
    id: number;
    name: string;
    conversionRate: number;
    totalLeads: number;
  }>;
}

export interface AutoAssignCriteria {
  criteria: string[];
  industry?: string;
  territory?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/users';

  /**
   * Получить список всех менеджеров
   */
  getManagers(availableOnly = false): Observable<Manager[]> {
    let params = new HttpParams();
    if (availableOnly) {
      params = params.set('availableOnly', 'true');
    }

    // Backend returns a Manager DTO with slightly different field names/types.
    // Normalize response into the frontend `Manager` shape so components (QuickAssign, etc.) render correctly.
    return this.http.get<unknown[]>(`${this.apiUrl}/managers`, { params }).pipe(
      map((list) => (list || []).map((item) => mapBackendToManager(item as Record<string, unknown>)))
    );
  }

  /**
   * Получить статистику по менеджерам
   */
  getManagersStatistics(): Observable<ManagerStats> {
    return this.http.get<ManagerStats>(`${this.apiUrl}/managers/stats`);
  }

  /**
   * Получить оптимального менеджера для автоназначения
   */
  getOptimalManagerForAssignment(criteria: AutoAssignCriteria): Observable<Manager | null> {
    return this.http.post<Manager | null>(`${this.apiUrl}/managers/auto-assign`, criteria);
  }

  /**
   * Получить менеджера по ID
   */
  getManagerById(id: number): Observable<Manager> {
    return this.http.get<Manager>(`${this.apiUrl}/${id}`);
  }

  /**
   * Инициализировать тестовых менеджеров (для разработки)
   */
  seedTestManagers(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/seed-managers`, {});
  }
}
