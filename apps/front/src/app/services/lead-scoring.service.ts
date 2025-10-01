import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeadScore {
  id: number;
  leadId: number;
  totalScore: number;
  temperature: 'cold' | 'warm' | 'hot';
  previousScore: number;
  lastCalculatedAt: Date;
  criteria: {
    profileCompletion: number;
    jobTitleMatch: number;
    companySize: number;
    industryMatch: number;
    websiteActivity: number;
    emailEngagement: number;
    formSubmissions: number;
    contentDownloads: number;
    responseTime: number;
    communicationFrequency: number;
    meetingAttendance: number;
    budgetConfirmed: number;
    decisionMaker: number;
    timeframeDefined: number;
  };
  scoreHistory?: {
    date: Date;
    score: number;
    changes: Record<string, unknown>;
    reason?: string;
  }[];
}

export interface HotLead {
  leadId: number;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadCompany?: string;
  totalScore: number;
  temperature: 'hot';
  lastCalculatedAt: Date;
}

export interface ScoreDistribution {
  cold: { count: number; percentage: number };
  warm: { count: number; percentage: number };
  hot: { count: number; percentage: number };
  total: number;
}

export interface BulkCalculateResult {
  leadId: number;
  score?: number;
  error?: string;
  success: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  count?: number;
}

export interface ActivityMetadata {
  timestamp?: string;
  page?: string;
  duration?: number;
  referrer?: string;
  emailId?: string;
  linkUrl?: string;
  formType?: string;
  contentType?: string;
  contentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeadScoringService {
  private readonly baseUrl = '/api/lead-scoring';
  private readonly http = inject(HttpClient);

  /**
   * Рассчитать скор для конкретного лида
   */
  calculateLeadScore(leadId: number): Observable<ApiResponse<{ score: number; leadId: number }>> {
    return this.http.post<ApiResponse<{ score: number; leadId: number }>>(
      `${this.baseUrl}/leads/${leadId}/calculate-advanced`,
      {}
    );
  }

  /**
   * Массовый пересчет скоров
   */
  bulkCalculateScores(leadIds?: number[]): Observable<ApiResponse<{ processed: number; results: BulkCalculateResult[] }>> {
    return this.http.post<ApiResponse<{ processed: number; results: BulkCalculateResult[] }>>(
      `${this.baseUrl}/bulk-calculate`,
      { leadIds }
    );
  }

  /**
   * Получить детальную информацию о скоре лида
   */
  getLeadScore(leadId: number): Observable<ApiResponse<LeadScore>> {
    return this.http.get<ApiResponse<LeadScore>>(`${this.baseUrl}/scores/${leadId}`);
  }

  /**
   * Получить список горячих лидов
   */
  getHotLeads(limit = 50): Observable<ApiResponse<HotLead[]>> {
    return this.http.get<ApiResponse<HotLead[]>>(`${this.baseUrl}/hot-leads?limit=${limit}`);
  }

  /**
   * Отследить активность лида
   */
  trackActivity(activityData: {
    leadId: number;
    activityType: string;
    metadata?: ActivityMetadata;
  }): Observable<ApiResponse<{ leadId: number; newScore: number }>> {
    return this.http.post<ApiResponse<{ leadId: number; newScore: number }>>(
      `${this.baseUrl}/track-activity`,
      activityData
    );
  }

  /**
   * Получить распределение скоров
   */
  getScoreDistribution(): Observable<ApiResponse<ScoreDistribution>> {
    return this.http.get<ApiResponse<ScoreDistribution>>(`${this.baseUrl}/analytics/distribution`);
  }

  /**
   * Отследить посещение сайта
   */
  trackWebsiteVisit(leadId: number, metadata?: {
    page?: string;
    duration?: number;
    referrer?: string;
  }): Observable<ApiResponse<{ leadId: number; newScore: number }>> {
    return this.trackActivity({
      leadId,
      activityType: 'website_visit',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Отследить открытие email
   */
  trackEmailOpen(leadId: number, emailId?: string): Observable<ApiResponse<{ leadId: number; newScore: number }>> {
    return this.trackActivity({
      leadId,
      activityType: 'email_open',
      metadata: {
        emailId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Отследить клик по ссылке в email
   */
  trackEmailClick(leadId: number, emailId?: string, linkUrl?: string): Observable<ApiResponse<{ leadId: number; newScore: number }>> {
    return this.trackActivity({
      leadId,
      activityType: 'email_click',
      metadata: {
        emailId,
        linkUrl,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Отследить заполнение формы
   */
  trackFormSubmission(leadId: number, formType: string, metadata?: ActivityMetadata): Observable<ApiResponse<{ leadId: number; newScore: number }>> {
    return this.trackActivity({
      leadId,
      activityType: 'form_submission',
      metadata: {
        formType,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Отследить скачивание контента
   */
  trackContentDownload(leadId: number, contentType: string, contentId?: string): Observable<ApiResponse<{ leadId: number; newScore: number }>> {
    return this.trackActivity({
      leadId,
      activityType: 'content_download',
      metadata: {
        contentType,
        contentId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Получить температуру лида на основе скора
   */
  getTemperatureFromScore(score: number): 'cold' | 'warm' | 'hot' {
    if (score >= 71) return 'hot';
    if (score >= 31) return 'warm';
    return 'cold';
  }

  /**
   * Получить цвет для температуры
   */
  getTemperatureColor(temperature: 'cold' | 'warm' | 'hot'): string {
    switch (temperature) {
      case 'hot':
        return '#f44336';
      case 'warm':
        return '#ff9800';
      case 'cold':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  }

  /**
   * Получить приоритет для сортировки по температуре
   */
  getTemperaturePriority(temperature: 'cold' | 'warm' | 'hot'): number {
    switch (temperature) {
      case 'hot':
        return 3;
      case 'warm':
        return 2;
      case 'cold':
        return 1;
      default:
        return 0;
    }
  }
}