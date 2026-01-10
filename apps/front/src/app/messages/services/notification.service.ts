import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SendNotificationDto,
  SendMultiChannelDto,
  NotificationResult,
  MultiChannelResult,
  HealthCheckResponse,
  ChannelStat,
  DashboardStats,
  ChannelStats,
  CampaignStats,
} from '../models/message.models';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/messages';

  /**
   * Отправить уведомление через один канал
   */
  send(dto: SendNotificationDto): Observable<NotificationResult> {
    return this.http.post<NotificationResult>(`${this.apiUrl}/send`, dto);
  }

  /**
   * Отправить уведомление через несколько каналов
   */
  sendMultiChannel(dto: SendMultiChannelDto): Observable<MultiChannelResult> {
    return this.http.post<MultiChannelResult>(`${this.apiUrl}/send-multi`, dto);
  }

  /**
   * Массовая отправка через один канал
   */
  sendBulk(data: { channel: string; notifications: any[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-bulk`, data);
  }

  /**
   * Проверка доступности каналов
   */
  checkHealth(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${this.apiUrl}/health`);
  }

  /**
   * Статистика по каналам
   */
  getStats(): Observable<{ [key: string]: ChannelStat }> {
    return this.http.get<{ [key: string]: ChannelStat }>(`${this.apiUrl}/stats`);
  }

  /**
   * Получить общую статистику панели управления
   */
  getDashboardStats(startDate?: string, endDate?: string): Observable<DashboardStats> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    
    return this.http.get<DashboardStats>(`${this.apiUrl}/analytics/dashboard`, { params });
  }

  /**
   * Получить статистику по каналам доставки
   */
  getChannelStats(startDate?: string, endDate?: string): Observable<ChannelStats[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    
    return this.http.get<ChannelStats[]>(`${this.apiUrl}/analytics/channels`, { params });
  }

  /**
   * Получить топ кампаний
   */
  getTopCampaigns(limit?: number, startDate?: string, endDate?: string): Observable<CampaignStats[]> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    
    return this.http.get<CampaignStats[]>(`${this.apiUrl}/analytics/campaigns`, { params });
  }

  /**
   * Получить статистику по дням
   */
  getStatsByDay(startDate: string, endDate: string): Observable<Array<{
    date: string;
    total: number;
    delivered: number;
    failed: number;
  }>> {
    let params = new HttpParams();
    params = params.set('startDate', startDate);
    params = params.set('endDate', endDate);
    
    return this.http.get<Array<{
      date: string;
      total: number;
      delivered: number;
      failed: number;
    }>>(`${this.apiUrl}/analytics/by-day`, { params });
  }

  /**
   * Получить статистику конкретной кампании
   */
  getCampaignStats(campaignId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/campaigns/${campaignId}/stats`);
  }

  /**
   * Получить временную статистику кампании
   */
  getCampaignTimeline(campaignId: string, interval: 'hour' | 'day' = 'hour', hours: number = 24): Observable<{
    timeline: Array<{
      timestamp: string;
      sent: number;
      delivered: number;
      failed: number;
    }>;
  }> {
    let params = new HttpParams();
    params = params.set('interval', interval);
    params = params.set('hours', hours.toString());
    
    return this.http.get<any>(`${this.apiUrl}/campaigns/${campaignId}/stats/timeline`, { params });
  }
}
