import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface CdrItem {
  id: string;
  calldate: string; // ISO
  src: string;
  dst: string;
  disposition: string;
  duration: number; // seconds
  billsec?: number;
  uniqueid?: string;
  user?: string | null;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class CallsService {
  private http = inject(HttpClient);
  private base = environment.apiBase + '/cdr';

  list(page = 1, limit = 20, filter: { src?: string; dst?: string; disposition?: string } = {}): Observable<PagedResult<CdrItem>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (filter.src) params = params.set('src', filter.src);
    if (filter.dst) params = params.set('dst', filter.dst);
    if (filter.disposition) params = params.set('disposition', filter.disposition);
    return this.http.get<PagedResult<CdrItem>>(this.base, { params });
  }

  getOne(id: string) {
    return this.http.get<CdrItem>(`${this.base}/unique/${encodeURIComponent(id)}`);
  }
}
