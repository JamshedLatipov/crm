import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CallFilters,
  AgentPerformanceResponse,
  CallsOverview,
  SlaMetrics,
  AbandonedCalls,
  QueuePerformance,
  IvrAnalysis,
  CallConversion,
} from '../models/analytics.models';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBase + '/analytics/calls';

  getAgentPerformance(filters: CallFilters): Observable<AgentPerformanceResponse> {
    const params = this.buildParams(filters);
    return this.http.get<AgentPerformanceResponse>(`${this.baseUrl}/agent-performance`, { params });
  }

  getCallsOverview(filters: CallFilters): Observable<CallsOverview> {
    const params = this.buildParams(filters);
    return this.http.get<CallsOverview>(`${this.baseUrl}/overview`, { params });
  }

  getSlaMetrics(filters: CallFilters): Observable<SlaMetrics> {
    const params = this.buildParams(filters);
    return this.http.get<SlaMetrics>(`${this.baseUrl}/sla`, { params });
  }

  getAbandonedCalls(filters: CallFilters): Observable<AbandonedCalls> {
    const params = this.buildParams(filters);
    return this.http.get<AbandonedCalls>(`${this.baseUrl}/abandoned`, { params });
  }

  getQueuePerformance(filters: CallFilters): Observable<QueuePerformance> {
    const params = this.buildParams(filters);
    return this.http.get<QueuePerformance>(`${this.baseUrl}/queue-performance`, { params });
  }

  getIvrAnalysis(filters: CallFilters): Observable<IvrAnalysis> {
    const params = this.buildParams(filters);
    return this.http.get<IvrAnalysis>(`${this.baseUrl}/ivr-analysis`, { params });
  }

  getCallConversion(filters: CallFilters): Observable<CallConversion> {
    const params = this.buildParams(filters);
    return this.http.get<CallConversion>(`${this.baseUrl}/conversion`, { params });
  }

  private buildParams(filters: CallFilters): HttpParams {
    let params = new HttpParams();

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }

    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    if (filters.timezone) {
      params = params.set('timezone', filters.timezone);
    }

    if (filters.agents && filters.agents.length > 0) {
      filters.agents.forEach(agent => {
        params = params.append('agents', agent);
      });
    }

    if (filters.queues && filters.queues.length > 0) {
      filters.queues.forEach(queue => {
        params = params.append('queues', queue);
      });
    }

    if (filters.directions && filters.directions.length > 0) {
      filters.directions.forEach(direction => {
        params = params.append('directions', direction);
      });
    }

    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => {
        params = params.append('statuses', status);
      });
    }

    if (filters.minDuration !== undefined) {
      params = params.set('minDuration', filters.minDuration.toString());
    }

    if (filters.maxDuration !== undefined) {
      params = params.set('maxDuration', filters.maxDuration.toString());
    }

    return params;
  }
}
