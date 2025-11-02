import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserActivityDto {
  id: string;
  userId: string;
  type: string;
  metadata?: Record<string, any>;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserActivityService {
  private readonly http = inject(HttpClient);

  getUserActivities(userId: string, query?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Observable<UserActivityDto[]> {
    const params: any = {};
    if (query?.type) params.type = query.type;
    if (query?.startDate) params.startDate = query.startDate;
    if (query?.endDate) params.endDate = query.endDate;
    if (query?.limit) params.limit = query.limit;
    if (query?.offset) params.offset = query.offset;

    return this.http.get<UserActivityDto[]>(`${environment.apiBase}/user-activities/user/${userId}`, { params });
  }

  getRecentUserActivities(userId: string, limit = 10): Observable<UserActivityDto[]> {
    return this.http.get<UserActivityDto[]>(`${environment.apiBase}/user-activities/user/${userId}/recent`, {
      params: { limit: limit.toString() }
    });
  }
}