import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CdrRecord {
  calldate: string;
  src: string;
  dst: string;
  disposition: string;
  duration: number;
  billsec: number;
  uniqueid: string;
}

export interface CdrPagedResponse {
  data: CdrRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CdrQuery {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  operatorId?: string;
}

@Injectable({ providedIn: 'root' })
export class SoftphoneCallHistoryService {
  http = inject(HttpClient);

  list(apiBase: string, query: CdrQuery): Observable<CdrPagedResponse> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '')
        params = params.set(k, String(v));
    });
    
    return this.http.get<CdrPagedResponse>(`${apiBase}/cdr`, { params });
  }
}
