import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private base = '/api/reports';
  constructor(private http: HttpClient) {}

  leadsOverview(days = 30) {
    return this.http.get(`${this.base}/leads/overview?days=${days}`);
  }

  funnel() {
    return this.http.get(`${this.base}/funnel`);
  }

  forecast(period: 'month' | 'quarter' | 'year' = 'month') {
    return this.http.get(`${this.base}/forecast?period=${period}`);
  }

  tasks(days = 30) {
    return this.http.get(`${this.base}/tasks?days=${days}`);
  }
}
