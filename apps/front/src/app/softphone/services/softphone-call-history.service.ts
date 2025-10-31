import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CdrRecord, CdrQuery, CdrResponse } from '../types/cdr.types';

@Injectable({
  providedIn: 'root'
})
export class SoftphoneCallHistoryService {
  private http = inject(HttpClient);

  list(apiBase: string, query: CdrQuery): Observable<CdrResponse> {
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

    return this.http.get<CdrResponse>(`${apiBase}/cdr`, { params });
  }

  getById(apiBase: string, id: string): Observable<CdrRecord> {
    return this.http.get<CdrRecord>(`${apiBase}/cdr/${id}`);
  }
}