import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { CdrRecord, CdrQuery, CdrResponse } from '../types/cdr.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SoftphoneCallHistoryService {
  private http = inject(HttpClient);
  private apiBase = environment.apiBase;

  list(apiBase: string | null, query: CdrQuery): Observable<CdrResponse> {
    const base = apiBase || this.apiBase;
    let params = new HttpParams()
      .set('page', query.page.toString())
      .set('limit', query.limit.toString());

    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }
    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.operatorId) {
      params = params.set('operatorId', query.operatorId);
    }

    return this.http.get<CdrResponse>(`${base}/cdr`, { params });
  }

  getById(apiBase: string | null, id: string): Observable<CdrRecord> {
    const base = apiBase || this.apiBase;
    return this.http.get<CdrRecord>(`${base}/cdr/${id}`);
  }

  /**
   * Save call log / metadata for a specific call
   */
  saveCallLog(
    callId: string | null,
    payload: {
      note?: string;
      callType?: string | null;
      scriptBranch?: string | null;
      duration?: number;
      disposition?: string | null;
    }
  ): Promise<any> {
    const body = { callId, ...payload };
    return firstValueFrom(this.http.post(`${this.apiBase}/cdr/log`, body));
  }

  /**
   * List auxiliary call logs saved by frontend
   */
  listCallLogs(limit = 50, offset = 0): Observable<any> {
    const params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    return this.http.get<any>(`${this.apiBase}/cdr/logs`, { params });
  }
}