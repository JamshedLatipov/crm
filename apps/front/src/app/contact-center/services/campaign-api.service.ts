import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  OutboundCampaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignFilters,
  OutboundCampaignContact,
  UploadContactDto,
  UploadContactsResult,
  CampaignStatistics,
} from '../models/campaign.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CampaignApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/contact-center/campaigns`;

  getCampaigns(filters?: CampaignFilters): Observable<OutboundCampaign[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.queueId) params = params.set('queueId', filters.queueId);
    }

    return this.http.get<OutboundCampaign[]>(this.baseUrl, { params });
  }

  getCampaign(id: string): Observable<OutboundCampaign> {
    return this.http.get<OutboundCampaign>(`${this.baseUrl}/${id}`);
  }

  createCampaign(dto: CreateCampaignDto): Observable<OutboundCampaign> {
    return this.http.post<OutboundCampaign>(this.baseUrl, dto);
  }

  updateCampaign(id: string, dto: UpdateCampaignDto): Observable<OutboundCampaign> {
    return this.http.patch<OutboundCampaign>(`${this.baseUrl}/${id}`, dto);
  }

  deleteCampaign(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  startCampaign(id: string): Observable<OutboundCampaign> {
    return this.http.post<OutboundCampaign>(`${this.baseUrl}/${id}/start`, {});
  }

  stopCampaign(id: string): Observable<OutboundCampaign> {
    return this.http.post<OutboundCampaign>(`${this.baseUrl}/${id}/stop`, {});
  }

  pauseCampaign(id: string): Observable<OutboundCampaign> {
    return this.http.post<OutboundCampaign>(`${this.baseUrl}/${id}/pause`, {});
  }

  resumeCampaign(id: string): Observable<OutboundCampaign> {
    return this.http.post<OutboundCampaign>(`${this.baseUrl}/${id}/resume`, {});
  }

  uploadContacts(id: string, contacts: UploadContactDto[]): Observable<UploadContactsResult> {
    return this.http.post<UploadContactsResult>(`${this.baseUrl}/${id}/contacts`, {
      contacts,
    });
  }

  loadContactsFromSegment(id: string, segmentId: string): Observable<UploadContactsResult> {
    return this.http.post<UploadContactsResult>(
      `${this.baseUrl}/${id}/contacts/from-segment/${segmentId}`,
      {}
    );
  }

  loadAllContacts(id: string, filters?: { search?: string; companyId?: number }): Observable<UploadContactsResult> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.companyId) params = params.set('companyId', filters.companyId.toString());

    return this.http.post<UploadContactsResult>(
      `${this.baseUrl}/${id}/contacts/from-system`,
      {},
      { params }
    );
  }

  getContacts(id: string): Observable<OutboundCampaignContact[]> {
    return this.http.get<OutboundCampaignContact[]>(`${this.baseUrl}/${id}/contacts`);
  }

  getStatistics(id: string): Observable<CampaignStatistics> {
    return this.http.get<CampaignStatistics>(`${this.baseUrl}/${id}/statistics`);
  }
}
