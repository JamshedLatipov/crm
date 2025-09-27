import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lead, CreateLeadDto, UpdateLeadDto, LeadStatus } from './dtos';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private readonly apiUrl = environment.apiBase + '/leads';
  private readonly http = inject(HttpClient);

  // === CRUD операции ===
  listLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(this.apiUrl);
  }

  getLeadById(id: string): Observable<Lead> {
    return this.http.get<Lead>(`${this.apiUrl}/${id}`);
  }

  createLead(dto: CreateLeadDto): Observable<Lead> {
    return this.http.post<Lead>(this.apiUrl, dto);
  }

  updateLead(id: string, dto: UpdateLeadDto): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${id}`, dto);
  }

  deleteLead(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // === Специфичные операции для лидов ===
  
  // Квалификация лида
  qualifyLead(id: string, score: number): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${id}/qualify`, { 
      status: LeadStatus.QUALIFIED,
      score 
    });
  }

  // Отклонение лида
  rejectLead(id: string, reason: string): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${id}/reject`, { 
      status: LeadStatus.UNQUALIFIED,
      notes: reason 
    });
  }

  // Конвертация лида в сделку
  convertToDeal(id: string, dealData: {
    amount: number;
    currency: string;
    expectedCloseDate: Date;
    stageId: string;
  }): Observable<{ lead: Lead; dealId: string }> {
    return this.http.post<{ lead: Lead; dealId: string }>(`${this.apiUrl}/${id}/convert`, dealData);
  }

  // Назначение лида менеджеру
  assignLead(id: string, managerId: string): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${id}/assign`, { assignedTo: managerId });
  }

  // Фильтрация лидов
  getLeadsByStatus(status: LeadStatus): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.apiUrl}?status=${status}`);
  }

  getLeadsByManager(managerId: string): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.apiUrl}?assignedTo=${managerId}`);
  }

  // Поиск лидов
  searchLeads(query: string): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }
}
