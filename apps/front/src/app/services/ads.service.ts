import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@crm/front/environments/environment';

export interface Campaign {
  id: number;
  campaignId?: string;
  name?: string;
  status?: string;
  account?: any;
  budget?: number;
}

export interface CampaignMetric {
  date: string;
  impressions: number;
  clicks: number;
  leads: number;
  cost: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AdsService {
  private readonly baseUrl = environment.apiBase +'/ads';
  private readonly http = inject(HttpClient);

  getCampaigns(): Observable<ApiResponse<Campaign[]>> {
    return this.http.get<ApiResponse<Campaign[]>>(`${this.baseUrl}/campaigns`);
  }

  getCampaignMetrics(campaignId: number): Observable<ApiResponse<CampaignMetric[]>> {
    return this.http.get<ApiResponse<CampaignMetric[]>>(`${this.baseUrl}/campaigns/${campaignId}/metrics`);
  }

  updateCampaign(campaignId: number, data: Partial<Campaign>): Observable<ApiResponse<Campaign>> {
    return this.http.patch<ApiResponse<Campaign>>(`${this.baseUrl}/campaigns/${campaignId}`, data);
  }

  pauseCampaign(campaignId: number): Observable<ApiResponse<Campaign>> {
    return this.http.post<ApiResponse<Campaign>>(`${this.baseUrl}/campaigns/${campaignId}/pause`, {});
  }

  resumeCampaign(campaignId: number): Observable<ApiResponse<Campaign>> {
    return this.http.post<ApiResponse<Campaign>>(`${this.baseUrl}/campaigns/${campaignId}/resume`, {});
  }

  listAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/accounts`);
  }

  unlinkAccount(accountId: number) {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/accounts/${accountId}`);
  }

  refreshFacebookTokens() {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/facebook/refresh-tokens`, {});
  }

  seedAds() {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/seed`, {});
  }

  refreshAccount(accountId: number) {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/accounts/${accountId}/refresh`, {});
  }
}
