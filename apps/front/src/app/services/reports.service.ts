import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

  contactsReport(groupByField?: string): Observable<ContactsReportData> {
    const params = groupByField ? `?groupBy=${groupByField}` : '';
    return this.http.get<ContactsReportData>(`${this.base}/contacts${params}`);
  }

  contactsCustomFieldDistribution(fieldName: string): Observable<CustomFieldDistributionData> {
    return this.http.get<CustomFieldDistributionData>(
      `${this.base}/contacts/custom-field/${fieldName}`
    );
  }
}

export interface ContactsReportData {
  totalContacts: number;
  activeCount: number;
  recentCount: number;
  withEmailCount: number;
  withPhoneCount: number;
  byType: Record<string, number>;
  groupedBy?: string;
  groupedData?: Record<string, number>;
}

export interface CustomFieldDistributionData {
  fieldName: string;
  totalContacts: number;
  withValueCount: number;
  fillRate: number;
  distribution: Record<string, number>;
}
