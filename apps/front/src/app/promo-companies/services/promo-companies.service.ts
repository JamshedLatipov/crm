import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PromoCompany,
  CreatePromoCompanyRequest,
  UpdatePromoCompanyRequest,
  AddLeadsToPromoCompanyRequest,
  RemoveLeadsFromPromoCompanyRequest,
} from '../models/promo-company.model';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PromoCompaniesService {
  private apiUrl = environment.apiBase + '/promo-companies';

  constructor(private http: HttpClient) {}

  getAll(): Observable<PromoCompany[]> {
    return this.http.get<PromoCompany[]>(this.apiUrl);
  }

  getById(id: number): Observable<PromoCompany> {
    return this.http.get<PromoCompany>(`${this.apiUrl}/${id}`);
  }

  create(request: CreatePromoCompanyRequest): Observable<PromoCompany> {
    return this.http.post<PromoCompany>(this.apiUrl, request);
  }

  update(
    id: number,
    request: UpdatePromoCompanyRequest
  ): Observable<PromoCompany> {
    return this.http.patch<PromoCompany>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addLeads(
    id: number,
    request: AddLeadsToPromoCompanyRequest
  ): Observable<PromoCompany> {
    return this.http.post<PromoCompany>(`${this.apiUrl}/${id}/leads`, request);
  }

  removeLeads(
    id: number,
    request: RemoveLeadsFromPromoCompanyRequest
  ): Observable<PromoCompany> {
    return this.http.request<PromoCompany>(
      'delete',
      `${this.apiUrl}/${id}/leads`,
      { body: request }
    );
  }

  getLeads(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/leads`);
  }

  getLeadsStats(id: number): Observable<{
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    averageValue: number;
  }> {
    return this.http.get<{
      totalLeads: number;
      convertedLeads: number;
      conversionRate: number;
      averageValue: number;
    }>(`${this.apiUrl}/${id}/leads/stats`);
  }
}
