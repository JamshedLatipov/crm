import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TransferRequest {
  channelId: string | null;
  target: string;
  type?: 'blind' | 'attended';
}

export interface TransferResponse {
  ok: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CallsApiService {
  private http = inject(HttpClient);
  private base = environment.apiBase + '/calls';

  transfer(body: TransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(`${this.base}/transfer`, body);
  }
}
