import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { StoOrder } from './sto-websocket.service';

export interface TrackingInfo {
  orderId: string;
  queueNumber: number;
  queueNumberInZone: number;
  zone: string;
  status: string;
  currentPosition: number;
  estimatedWaitMinutes: number;
  canCancel: boolean;
  vehicleMake: string;
  vehicleModel: string;
  workType: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JoinQueueDto {
  token: string;
  phone: string;
  customerName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  licensePlate?: string;
  workType?: string;
  workDescription?: string;
}

export interface JoinQueueResponse {
  success: boolean;
  message: string;
  queueNumber: number;
  estimatedWaitMinutes: number;
  customerId: string;
  orderId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StoApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.stoApiUrl || 'http://localhost:3002';
  /**
   * Generate a simple UUID v4 for mock data
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  /**
   * Get queue info by QR token
   */
  getQueueInfo(token: string): Observable<{
    zone: string;
    availableWorkTypes: string[];
    estimatedWaitMinutes: number;
  }> {
    // Demo mode: provide mock data for demo tokens
    if (token?.startsWith('demo-')) {
      const zoneMap: Record<string, string> = {
        'demo-zone-a': 'Зона A',
        'demo-zone-b': 'Зона B',
        'demo-zone-c': 'Зона C',
      };
      return of({
        zone: zoneMap[token] || 'Зона Demo',
        availableWorkTypes: ['maintenance', 'repair', 'diagnostics', 'tire-service'],
        estimatedWaitMinutes: 45,
      }).pipe(delay(300));
    }

    const params = new HttpParams().set('token', token);
    return this.http.get<any>(`${this.apiUrl}/api/public/queue/info`, { params }).pipe(
      catchError((error) => {
        // Fallback to mock data if backend is unavailable
        console.warn('Backend unavailable, using mock data:', error);
        return of({
          zone: 'Зона Demo',
          availableWorkTypes: ['maintenance', 'repair', 'diagnostics', 'tire-service'],
          estimatedWaitMinutes: 45,
        }).pipe(delay(300));
      })
    );
  }

  /**
   * Join queue via QR code
   */
  joinQueue(data: JoinQueueDto): Observable<JoinQueueResponse> {
    return this.http.post<JoinQueueResponse>(
      `${this.apiUrl}/api/public/queue/join`,
      data
    ).pipe(
      catchError((error) => {
        console.warn('Backend unavailable, using mock response:', error);
        // Mock success response
        return of({
          success: true,
          message: 'Вы успешно записаны в очередь (DEMO режим)',
          queueNumber: Math.floor(Math.random() * 50) + 1,
          estimatedWaitMinutes: 45,
          customerId: this.generateUUID(),
          orderId: this.generateUUID(),
        } as JoinQueueResponse).pipe(delay(500));
      })
    );
  }

  /**
   * Track order status
   */
  trackOrder(orderId: string, phone: string): Observable<TrackingInfo> {
    const params = new HttpParams().set('phone', phone);
    return this.http.get<TrackingInfo>(
      `${this.apiUrl}/api/public/queue/status/${orderId}`,
      { params }
    ).pipe(
      catchError((error) => {
        console.warn('Backend unavailable, using mock data:', error);
        // Mock tracking info
        return of({
          orderId: orderId,
          queueNumber: 42,
          queueNumberInZone: 12,
          zone: 'Зона A',
          status: 'WAITING',
          currentPosition: 5,
          estimatedWaitMinutes: 30,
          canCancel: true,
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
          workType: 'maintenance',
          createdAt: new Date().toISOString(),
        } as TrackingInfo).pipe(delay(300));
      })
    );
  }

  /**
   * Cancel order
   */
  cancelOrder(orderId: string, phone: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(
      `${this.apiUrl}/api/public/queue/cancel/${orderId}`,
      { phone }
    ).pipe(
      catchError((error) => {
        console.warn('Backend unavailable, using mock response:', error);
        return of({
          success: true,
          message: 'Заказ успешно отменён (DEMO режим)',
        }).pipe(delay(300));
      })
    );
  }

  /**
   * Get all orders (admin)
   */
  getOrders(filters?: {
    zone?: string;
    status?: string;
    workType?: string;
  }): Observable<StoOrder[]> {
    let params = new HttpParams();
    if (filters?.zone) params = params.set('zone', filters.zone);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.workType) params = params.set('workType', filters.workType);

    return this.http.get<StoOrder[]>(`${this.apiUrl}/api/sto/orders`, { params });
  }

  /**
   * Update order status (mechanic)
   */
  updateOrderStatus(
    orderId: string,
    status: string,
    mechanicId?: string
  ): Observable<StoOrder> {
    return this.http.patch<StoOrder>(
      `${this.apiUrl}/api/sto/orders/${orderId}/status`,
      { status, mechanicId }
    );
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Observable<StoOrder> {
    return this.http.get<StoOrder>(`${this.apiUrl}/api/sto/orders/${orderId}`);
  }
}
