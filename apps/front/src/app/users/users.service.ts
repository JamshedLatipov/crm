import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
    return this.http.get<User[]>(`${this.apiUrl}/users/managers`);
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
}