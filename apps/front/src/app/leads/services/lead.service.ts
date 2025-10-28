import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Lead,
  LeadStatus,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadActivity,
  LeadStatistics,
  LeadFilters,
  AssignLeadRequest,
  QualifyLeadRequest,
  UpdateStatusRequest,
  AddNoteRequest,
  AddTagsRequest,
  ScheduleFollowUpRequest,
  Assignment,
} from '../models/lead.model';

import { CreateLeadActivityDto, UpdateLeadActivityDto } from '../models';
import { CreateDistributionRuleDto, UpdateDistributionRuleDto, CreateScoringRuleDto, UpdateScoringRuleDto } from '../models';
import { environment } from '../../../environments/environment';
import { UserService, Manager, AutoAssignCriteria } from '../../shared/services/user.service';
import { PromoCompaniesService } from '../../promo-companies/services/promo-companies.service';

@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private promoCompaniesService = inject(PromoCompaniesService);
  private readonly apiUrl = environment.apiBase + '/leads';

  // Basic CRUD operations
  getLeads(
    filters?: LeadFilters,
    page = 1,
    limit = 20
  ): Observable<{
    leads: Lead[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.status?.length) {
        params = params.set('status', filters.status.join(','));
      }
      if (filters.source?.length) {
        params = params.set('source', filters.source.join(','));
      }
      if (filters.priority?.length) {
        params = params.set('priority', filters.priority.join(','));
      }
      if (filters.assignedTo?.length) {
        params = params.set('assignedTo', filters.assignedTo.join(','));
      }
      if (filters.tags?.length) {
        params = params.set('tags', filters.tags.join(','));
      }
      if (filters.scoreMin !== undefined) {
        params = params.set('scoreMin', filters.scoreMin.toString());
      }
      if (filters.scoreMax !== undefined) {
        params = params.set('scoreMax', filters.scoreMax.toString());
      }
      if (filters.valueMin !== undefined) {
        params = params.set('valueMin', filters.valueMin.toString());
      }
      if (filters.valueMax !== undefined) {
        params = params.set('valueMax', filters.valueMax.toString());
      }
      if (filters.createdAfter) {
        params = params.set('createdAfter', filters.createdAfter.toISOString());
      }
      if (filters.createdBefore) {
        params = params.set(
          'createdBefore',
          filters.createdBefore.toISOString()
        );
      }
      if (filters.lastContactedAfter) {
        params = params.set(
          'lastContactedAfter',
          filters.lastContactedAfter.toISOString()
        );
      }
      if (filters.lastContactedBefore) {
        params = params.set(
          'lastContactedBefore',
          filters.lastContactedBefore.toISOString()
        );
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
    }

    return this.http.get<{
      leads: Lead[];
      total: number;
      page: number;
      totalPages: number;
    }>(this.apiUrl, { params });
  }

  getLeadById(id: string): Observable<Lead> {
    return this.http.get<Lead>(`${this.apiUrl}/${id}`);
  }

  createLead(request: CreateLeadRequest): Observable<Lead> {
    return this.http.post<Lead>(this.apiUrl, request);
  }

  updateLead(id: string, request: UpdateLeadRequest): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${id}`, request);
  }

  deleteLead(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Analytics and statistics
  // Backend returns LeadStats shape; map it to frontend LeadStatistics
  getStatistics(): Observable<LeadStatistics> {
    return this.http.get<any>(`${this.apiUrl}/statistics`).pipe(
      map((r) => {
        const byStatus = r.byStatus || {};
        const bySource = r.bySource || {};
        const byPriority = r.byPriority || {};

        const convertedLeads = byStatus['converted'] || byStatus['CONVERTED'] || 0;
        const qualifiedLeads = byStatus['qualified'] || byStatus['QUALIFIED'] || 0;
        const newLeads = byStatus['new'] || byStatus['NEW'] || 0;

        const mapped: LeadStatistics = {
          totalLeads: r.total ?? 0,
          newLeads: newLeads,
          qualifiedLeads: qualifiedLeads,
          convertedLeads: convertedLeads,
          conversionRate: r.conversionRate ?? 0,
          averageScore: r.averageScore ?? 0,
          totalValue: r.totalEstimatedValue ?? r.totalValue ?? 0,
          byStatus: byStatus,
          bySource: bySource,
          byPriority: byPriority,
        };

        return mapped;
      })
    );
  }

  getLeadActivities(leadId: string): Observable<LeadActivity[]> {
    return this.http.get<LeadActivity[]>(`${this.apiUrl}/${leadId}/activities`);
  }

  getCurrentAssignments(leadId: string): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(`${this.apiUrl}/${leadId}/assignments`);
  }

  createLeadActivity(leadId: string, dto: CreateLeadActivityDto): Observable<LeadActivity> {
    return this.http.post<LeadActivity>(`${this.apiUrl}/${leadId}/activities`, dto);
  }

  updateLeadActivity(leadId: string, activityId: string, dto: UpdateLeadActivityDto): Observable<LeadActivity> {
    return this.http.patch<LeadActivity>(`${this.apiUrl}/${leadId}/activities/${activityId}`, dto);
  }

  // Distribution rules
  listDistributionRules(): Observable<CreateDistributionRuleDto[]> {
    return this.http.get<CreateDistributionRuleDto[]>(`${this.apiUrl}/distribution-rules`);
  }

  createDistributionRule(dto: CreateDistributionRuleDto): Observable<CreateDistributionRuleDto> {
    return this.http.post<CreateDistributionRuleDto>(`${this.apiUrl}/distribution-rules`, dto);
  }

  updateDistributionRule(id: string, dto: UpdateDistributionRuleDto): Observable<CreateDistributionRuleDto> {
    return this.http.patch<CreateDistributionRuleDto>(`${this.apiUrl}/distribution-rules/${id}`, dto);
  }

  deleteDistributionRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/distribution-rules/${id}`);
  }

  // Scoring rules
  listScoringRules(): Observable<CreateScoringRuleDto[]> {
    return this.http.get<CreateScoringRuleDto[]>(`${this.apiUrl}/scoring-rules`);
  }

  createScoringRule(dto: CreateScoringRuleDto): Observable<CreateScoringRuleDto> {
    return this.http.post<CreateScoringRuleDto>(`${this.apiUrl}/scoring-rules`, dto);
  }

  updateScoringRule(id: string, dto: UpdateScoringRuleDto): Observable<CreateScoringRuleDto> {
    return this.http.patch<CreateScoringRuleDto>(`${this.apiUrl}/scoring-rules/${id}`, dto);
  }

  deleteScoringRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/scoring-rules/${id}`);
  }

  // Search and filtering
  searchLeads(query: string): Observable<Lead[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Lead[]>(`${this.apiUrl}/search`, { params });
  }

  getHighValueLeads(minValue = 100000): Observable<Lead[]> {
    const params = new HttpParams().set('minValue', minValue.toString());
    return this.http.get<Lead[]>(`${this.apiUrl}/high-value`, { params });
  }

  getStaleLeads(daysSinceContact = 30): Observable<Lead[]> {
    const params = new HttpParams().set('days', daysSinceContact.toString());
    return this.http.get<Lead[]>(`${this.apiUrl}/stale`, { params });
  }

  getLeadsByManager(managerId: string): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.apiUrl}/manager/${managerId}`);
  }

  // Lead management operations
  assignLead(leadId: string, assigneeId: string): Observable<Lead> {
    const request: AssignLeadRequest = { managerId: assigneeId };
    return this.http.patch<Lead>(`${this.apiUrl}/${leadId}/assign`, request);
  }

  /**
   * Bulk assign leads to a manager. Returns updated leads.
   * Backend endpoint expected to accept { leadIds: string[], managerId: string }
   */
  bulkAssign(leadIds: string[], assigneeId: string): Observable<Lead[]> {
    const body = { leadIds, managerId: assigneeId };
    return this.http.patch<Lead[]>(`${this.apiUrl}/bulk-assign`, body);
  }

  updateLeadScore(leadId: string, score: number): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${leadId}/score`, { score });
  }

  updateLeadStatus(leadId: string, status: LeadStatus): Observable<Lead> {
    const request: UpdateStatusRequest = { status };
    return this.http.patch<Lead>(`${this.apiUrl}/${leadId}/status`, request);
  }

  qualifyLead(leadId: string, qualified: boolean): Observable<Lead> {
    const request: QualifyLeadRequest = { qualified };
    return this.http.patch<Lead>(`${this.apiUrl}/${leadId}/qualify`, request);
  }

  addNote(leadId: string, note: string): Observable<Lead> {
    const request: AddNoteRequest = { content: note };
    return this.http.post<Lead>(`${this.apiUrl}/${leadId}/notes`, request);
  }

  addTags(leadId: string, tags: string[]): Observable<Lead> {
    const request: AddTagsRequest = { tags };
    return this.http.post<Lead>(`${this.apiUrl}/${leadId}/tags`, request);
  }

  removeTags(leadId: string, tags: string[]): Observable<Lead> {
    const request: AddTagsRequest = { tags };
    return this.http.delete<Lead>(`${this.apiUrl}/${leadId}/tags`, {
      body: request,
    });
  }

  updateContact(
    leadId: string,
    contactInfo: Partial<Pick<Lead, 'email' | 'phone' | 'address'>>
  ): Observable<Lead> {
    return this.http.patch<Lead>(
      `${this.apiUrl}/${leadId}/contact`,
      contactInfo
    );
  }

  scheduleFollowUp(
    leadId: string,
    date: Date,
    notes?: string
  ): Observable<Lead> {
    const request: ScheduleFollowUpRequest = { followUpAt: date, notes };
    return this.http.post<Lead>(`${this.apiUrl}/${leadId}/follow-up`, request);
  }

  // Manager-related methods
  getAvailableManagers(): Observable<Manager[]> {
    return this.userService.getManagers(true);
  }

  getAllManagers(): Observable<Manager[]> {
    return this.userService.getManagers(false);
  }

  autoAssignLead(leadId: string, criteria: AutoAssignCriteria): Observable<Lead | null> {
    return this.http.post<Lead | null>(`${this.apiUrl}/${leadId}/auto-assign`, criteria);
  }

  // Additional methods for compatibility
  markAsContacted(leadId: string): Observable<Lead> {
    return this.updateLeadStatus(leadId, LeadStatus.CONTACTED);
  }

  // Create contact from lead via pipeline module
  createContactFromLead(leadId: string): Observable<any> {
    // returns created contact
    // pipeline endpoints are mounted under /pipeline
    return this.http.post<any>(`${environment.apiBase}/pipeline/leads/${leadId}/create-contact`, {});
  }

  getLeadStatistics(): Observable<LeadStatistics> {
    return this.getStatistics();
  }

  // Convert lead to deal
  convertToDeal(
    leadId: string,
    dealData: {
      title?: string;
      amount: number;
      currency?: string;
      probability?: number;
      expectedCloseDate: Date;
      stageId: string;
      notes?: string;
    }
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${leadId}/convert-to-deal`, {
      ...dealData,
      expectedCloseDate: dealData.expectedCloseDate.toISOString()
    });
  }

  // Promo company methods
  assignLeadToPromoCompany(leadId: string, promoCompanyId: number): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${leadId}/promo-company`, { promoCompanyId });
  }

  removeLeadFromPromoCompany(leadId: string): Observable<Lead> {
    return this.http.delete<Lead>(`${this.apiUrl}/${leadId}/promo-company`);
  }

  getLeadsByPromoCompany(promoCompanyId: number): Observable<Lead[]> {
    const params = new HttpParams().set('promoCompanyId', promoCompanyId.toString());
    return this.http.get<Lead[]>(this.apiUrl, { params });
  }
}
