import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@crm/front/environments/environment';

export interface TaskDto {
  id?: number;
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;
  assignedToId?: number;
  assignedTo?: any;
  leadId?: number;
  lead?: any;
  dealId?: string;
  deal?: any;
  taskTypeId?: number;
  taskType?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskComment {
  id?: number;
  taskId: number;
  authorId: number;
  author?: any;
  text: string;
  createdAt?: string;
}

export interface TaskHistory {
  id: number;
  action: string; // created, updated, status_changed, deleted
  details?: any;
  user?: any;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private base = environment.apiBase + '/tasks';
  constructor(private http: HttpClient) {}

  list(page?: number, limit?: number, leadId?: number, dealId?: string): Observable<any> {
    const params: any = {};
    if (page != null) params.page = page;
    if (limit != null) params.limit = limit;
    if (leadId != null) params.leadId = leadId;
    if (dealId != null) params.dealId = dealId;
    return this.http.get<any>(this.base, { params });
  }

  listByLead(leadId: number): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(this.base, { params: { leadId: leadId.toString() } });
  }

  listByDeal(dealId: string): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(this.base, { params: { dealId } });
  }

  get(id: number): Observable<TaskDto> {
    return this.http.get<TaskDto>(`${this.base}/${id}`);
  }
  
  create(dto: TaskDto): Observable<TaskDto> {
    return this.http.post<TaskDto>(this.base, dto);
  }
  
  update(id: number, dto: Partial<TaskDto>): Observable<TaskDto> {
    return this.http.patch<TaskDto>(`${this.base}/${id}`, dto);
  }
  
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  
  // Comments
  getComments(taskId: number): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(`${this.base}/${taskId}/comments`);
  }
  
  addComment(taskId: number, authorId: number, text: string): Observable<TaskComment> {
    return this.http.post<TaskComment>(`${this.base}/${taskId}/comment`, { authorId, text });
  }

  // History
  getHistory(taskId: number): Observable<TaskHistory[]> {
    return this.http.get<TaskHistory[]>(`${this.base}/${taskId}/history`);
  }
}
