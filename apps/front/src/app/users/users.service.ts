import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { mapBackendToManager } from '../shared/services/user.mappers';

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  avatar?: string;
  workload: number;
  maxCapacity: number;
  workloadPercentage: number;
  role: string;
  conversionRate: number;
  isAvailable: boolean;
  skills: string[];
  territories: string[];
  // Workload for deals and tasks (optional, provided by newer backend responses)
  currentDealsCount?: number;
  maxDealsCapacity?: number;
  currentTasksCount?: number;
  maxTasksCapacity?: number;
  // Workload for leads (optional, provided by newer backend responses)
  currentLeadsCount?: number;
  maxLeadsCapacity?: number;
  // Optional fields present on raw /users responses used by various components
  sip_endpoint_id?: string; // snake_case from backend
  sipEndpointId?: string; // camelCase variant
  sipEndpoint?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
}

export interface ManagersStats {
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

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase;

  getAllManagers(): Observable<User[]> {
    // Use the shared backend->manager mapper so workload fields (leads/deals/tasks)
    // are normalized (handles snake_case and legacy fields like `workload`/`maxCapacity`).
  return this.http.get<unknown[]>(`${this.apiUrl}/users/managers`).pipe(
      map(list => {
        const mapped = (list || []).map(item => {
          const m = mapBackendToManager(item as Record<string, unknown>);
          // Convert Manager -> User shape expected by various components
          return {
            id: String(m.id),
            name: m.fullName || m.username || '',
            email: m.email,
            department: m.department,
            avatar: undefined,
            workload: m.currentLeadsCount || 0,
            maxCapacity: m.maxLeadsCapacity || 0,
            workloadPercentage: m.workloadPercentage || 0,
            role: (m.roles && m.roles.length) ? m.roles[0] : '',
            conversionRate: m.conversionRate || 0,
            isAvailable: !!m.isAvailableForAssignment,
            skills: m.skills || [],
            territories: m.territories || [],
            // keep new fields if present; fall back to leads workload/capacity when backend
            // does not provide per-entity counts (so UI shows something instead of 0).
            currentDealsCount: m.currentDealsCount ?? m.currentLeadsCount ?? 0,
            maxDealsCapacity: m.maxDealsCapacity ?? m.maxLeadsCapacity ?? 0,
            currentTasksCount: m.currentTasksCount ?? m.currentLeadsCount ?? 0,
            maxTasksCapacity: m.maxTasksCapacity ?? m.maxLeadsCapacity ?? 0,
            currentLeadsCount: m.currentLeadsCount,
            maxLeadsCapacity: m.maxLeadsCapacity,
            firstName: m.firstName,
            lastName: m.lastName,
            fullName: m.fullName,
            username: m.username
          } as User;
        });
        console.log('UsersService: Mapped managers -> users', mapped);
        return mapped;
      })
    );
  }

  getAvailableManagers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/managers?available=true`);
  }

  getManagerById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/managers/${id}`);
  }

  getManagersStats(): Observable<ManagersStats> {
    return this.http.get<ManagersStats>(`${this.apiUrl}/users/managers/stats`);
  }

  getAutoAssignRecommendation(criteria: {
    criteria?: string[];
    industry?: string;
    territory?: string;
  }): Observable<User> {
    const params = new URLSearchParams();
    
    if (criteria.criteria?.length) {
      params.append('criteria', criteria.criteria.join(','));
    }
    if (criteria.industry) {
      params.append('industry', criteria.industry);
    }
    if (criteria.territory) {
      params.append('territory', criteria.territory);
    }

    return this.http.get<User>(`${this.apiUrl}/users/managers/auto-assign?${params.toString()}`);
  }

  /**
   * Get all users (raw) — used by UI components that need user metadata such as sip_endpoint_id
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
}