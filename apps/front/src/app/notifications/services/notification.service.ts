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
} from '../models/notification.models';
import { environment } from '@crm/front/environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/notifications';

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
}
