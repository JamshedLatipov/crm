import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  AgentStatus,
  AgentStatusEnum,
  SetAgentStatusDto,
} from '../types/agent-status.types';
import { environment } from '../../../environments/environment';

/**
 * Agent Status Service
 * Manages agent status operations and caching
 */
@Injectable({
  providedIn: 'root',
})
export class AgentStatusService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/contact-center`;

  // Current agent status cache (for logged-in agent)
  private readonly currentAgentStatus$ = new BehaviorSubject<AgentStatus | null>(null);

  /**
   * Get current agent status (observable)
   */
  getCurrentAgentStatus(): Observable<AgentStatus | null> {
    return this.currentAgentStatus$.asObservable();
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(filters?: {
    status?: AgentStatusEnum;
    queueName?: string;
    availableOnly?: boolean;
  }): Observable<AgentStatus[]> {
    let params: any = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.queueName) params['queueName'] = filters.queueName;
    if (filters?.availableOnly) params['availableOnly'] = 'true';

    return this.http.get<AgentStatus[]>(`${this.baseUrl}/agent-statuses`, {
      params,
    });
  }

  /**
   * Get single agent status by extension
   */
  getAgentStatus(extension: string): Observable<AgentStatus> {
    return this.http.get<AgentStatus>(
      `${this.baseUrl}/agent-statuses/${extension}`
    );
  }

  /**
   * Set agent status (generic method)
   */
  setAgentStatus(dto: SetAgentStatusDto): Observable<AgentStatus> {
    return this.http.post<AgentStatus>(`${this.baseUrl}/agent-statuses`, dto).pipe(
      tap((status) => {
        // Update current agent status if it's the same extension
        const current = this.currentAgentStatus$.value;
        if (current && current.extension === status.extension) {
          this.currentAgentStatus$.next(status);
        }
      })
    );
  }

  /**
   * Set agent online
   */
  setAgentOnline(
    extension: string,
    options?: { fullName?: string; queueName?: string }
  ): Observable<AgentStatus> {
    return this.http
      .post<AgentStatus>(
        `${this.baseUrl}/agent-statuses/${extension}/online`,
        options || {}
      )
      .pipe(
        tap((status) => this.currentAgentStatus$.next(status))
      );
  }

  /**
   * Set agent offline
   */
  setAgentOffline(
    extension: string,
    reason?: string
  ): Observable<AgentStatus> {
    return this.http
      .post<AgentStatus>(
        `${this.baseUrl}/agent-statuses/${extension}/offline`,
        { reason }
      )
      .pipe(
        tap((status) => this.currentAgentStatus$.next(status))
      );
  }

  /**
   * Set agent on break
   */
  setAgentOnBreak(
    extension: string,
    reason?: string
  ): Observable<AgentStatus> {
    return this.http
      .post<AgentStatus>(
        `${this.baseUrl}/agent-statuses/${extension}/break`,
        { reason }
      )
      .pipe(
        tap((status) => this.currentAgentStatus$.next(status))
      );
  }

  /**
   * Set agent in wrap-up
   */
  setAgentWrapUp(
    extension: string,
    callId?: string
  ): Observable<AgentStatus> {
    return this.http
      .post<AgentStatus>(
        `${this.baseUrl}/agent-statuses/${extension}/wrap-up`,
        { callId }
      )
      .pipe(
        tap((status) => this.currentAgentStatus$.next(status))
      );
  }

  /**
   * Get agents stuck in temporary statuses
   */
  getStuckAgents(maxMinutes: number = 60): Observable<AgentStatus[]> {
    return this.http.get<AgentStatus[]>(
      `${this.baseUrl}/agent-statuses-stuck`,
      {
        params: { maxMinutes: maxMinutes.toString() },
      }
    );
  }

  /**
   * Update current agent status (called from WebSocket events)
   */
  updateCurrentAgentStatus(status: AgentStatus | null): void {
    this.currentAgentStatus$.next(status);
  }

  /**
   * Helper: Set status based on enum value
   */
  setStatus(
    extension: string,
    status: AgentStatusEnum,
    options?: { reason?: string; queueName?: string; fullName?: string }
  ): Observable<AgentStatus> {
    const dto: SetAgentStatusDto = {
      extension,
      status,
      reason: options?.reason,
      queueName: options?.queueName,
      fullName: options?.fullName,
    };
    return this.setAgentStatus(dto);
  }
}
