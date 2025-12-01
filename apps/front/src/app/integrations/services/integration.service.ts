import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SectionConfig {
  type: 'table' | 'details';
  title: string;
  columns?: { key: string; label: string }[];
  fields?: { key: string; label: string }[];
}

export interface IntegrationSection {
  key: string;
  ui: SectionConfig;
  data: any;
}

export interface StandardizedCallInfo {
  name?: string;
  phone?: string;
  balance?: number;
  currency?: string;
  status?: string;
  externalUrl?: string;
  sections?: IntegrationSection[];
}

export interface IntegrationConfig {
  id?: number;
  name: string;
  isActive: boolean;
  sources: {
    key: string;
    urlTemplate: string;
    method: string;
    headers?: Record<string, string>;
    isList?: boolean;
    mapping?: Record<string, string>;
    ui?: SectionConfig;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBase}/integrations`;

  getCallInfo(phone: string): Observable<StandardizedCallInfo> {
    return this.http.get<StandardizedCallInfo>(`${this.apiUrl}/call-info/${phone}`).pipe(
      catchError(err => {
        console.error('Error fetching call info', err);
        return of({});
      })
    );
  }

  getConfigs(): Observable<IntegrationConfig[]> {
    return this.http.get<IntegrationConfig[]>(`${this.apiUrl}/config`);
  }

  saveConfig(config: IntegrationConfig): Observable<IntegrationConfig> {
    return this.http.post<IntegrationConfig>(`${this.apiUrl}/config`, config);
  }
}
