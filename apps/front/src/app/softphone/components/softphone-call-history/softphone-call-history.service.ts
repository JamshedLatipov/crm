import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, firstValueFrom } from 'rxjs';
import { CdrQuery, CdrRecord, CdrResponse } from './cdr.types';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SoftphoneCallHistoryService {
  private apiUrl = environment.apiBase + '/cdr'; // Adjust based on your API endpoint

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of CDR records
   */
  list(query?: CdrQuery): Promise<CdrResponse> {
    let params = new HttpParams();

    if (query) {
      if (query.limit) params = params.set('limit', query.limit.toString());
      if (query.offset) params = params.set('offset', query.offset.toString());
      if (query.startDate) params = params.set('startDate', query.startDate);
      if (query.endDate) params = params.set('endDate', query.endDate);
      if (query.src) params = params.set('src', query.src);
      if (query.dst) params = params.set('dst', query.dst);
      if (query.disposition)
        params = params.set('disposition', query.disposition);
    }

    return firstValueFrom(this.http.get<CdrResponse>(this.apiUrl, { params }));
  }

  /**
   * Get a single CDR record by ID
   */
  getById(id: string): Promise<CdrRecord> {
    return firstValueFrom(this.http.get<CdrRecord>(`${this.apiUrl}/unique/${id}`));
  }

  /**
   * Get CDR records for a specific number
   */
  getByNumber(number: string, limit = 50): Promise<CdrRecord[]> {
    const params = new HttpParams()
      .set('number', number)
      .set('limit', limit.toString());

    return firstValueFrom(
      this.http
        .get<CdrResponse>(`${this.apiUrl}/by-number`, { params })
        .pipe(map((response) => response.records))
    );
  }

  /**
   * Get recent calls (last N minutes)
   */
  getRecentCalls(minutes = 5): Promise<CdrRecord[]> {
    const params = new HttpParams().set('minutes', minutes.toString());

    return firstValueFrom(
      this.http.get<CdrRecord[]>(`${this.apiUrl}/recent`, { params })
    );
  }

  /**
   * Get call statistics
   */
  getStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    averageDuration: number;
    totalDuration: number;
  }> {
    let params = new HttpParams();

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return firstValueFrom(
      this.http.get<{
        totalCalls: number;
        answeredCalls: number;
        missedCalls: number;
        averageDuration: number;
        totalDuration: number;
      }>(`${this.apiUrl}/statistics`, { params })
    );
  }

  /**
   * Save call log / metadata for a specific call
   * Posts to `/api/cdr/log` with optional callId and payload
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
    return firstValueFrom(this.http.post(`${this.apiUrl}/log`, body));
  }

  /**
   * List auxiliary call logs saved by frontend
   */
  listCallLogs(limit = 50, offset = 0) {
    const params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    return this.http.get<any>(`${this.apiUrl}/logs`, { params });
  }
}
