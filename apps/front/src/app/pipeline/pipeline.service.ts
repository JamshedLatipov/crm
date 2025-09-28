import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Stage, CreateStageDto, UpdateStageDto, StageType, PipelineAnalytics } from './dtos';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PipelineService {
  private readonly apiUrl = environment.apiBase + '/pipeline';
  private readonly http = inject(HttpClient);

  // === Управление этапами воронки ===
  listStages(type?: StageType): Observable<Stage[]> {
    const url = type ? `${this.apiUrl}/stages?type=${type}` : `${this.apiUrl}/stages`;
    return this.http.get<Stage[]>(url);
  }

  getStageById(id: string): Observable<Stage> {
    return this.http.get<Stage>(`${this.apiUrl}/stages/${id}`);
  }

  createStage(dto: CreateStageDto): Observable<Stage> {
    return this.http.post<Stage>(`${this.apiUrl}/stages`, dto);
  }

  updateStage(id: string, dto: UpdateStageDto): Observable<Stage> {
    return this.http.patch<Stage>(`${this.apiUrl}/stages/${id}`, dto);
  }

  deleteStage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stages/${id}`);
  }

  // Изменение порядка этапов
  reorderStages(stageIds: string[]): Observable<Stage[]> {
    return this.http.post<Stage[]>(`${this.apiUrl}/stages/reorder`, { stageIds });
  }

  // === Аналитика воронки ===
  analytics(type?: StageType): Observable<PipelineAnalytics> {
    const url = type ? `${this.apiUrl}/analytics?type=${type}` : `${this.apiUrl}/analytics`;
    return this.http.get<PipelineAnalytics>(url);
  }

  // Конверсионная воронка
  getConversionFunnel(type: StageType): Observable<{
    stages: Array<{
      stageId: string;
      name: string;
      count: number;
      conversion: number;
    }>;
  }> {
    return this.http.get<{
      stages: Array<{
        stageId: string;
        name: string;
        count: number;
        conversion: number;
      }>;
    }>(`${this.apiUrl}/funnel?type=${type}`);
  }

  // === Автоматизация ===
  runAutomation(): Observable<{ processed: number; results: string[] }> {
    return this.http.post<{ processed: number; results: string[] }>(`${this.apiUrl}/automation/run`, {});
  }

  // Настройка правил автоматизации
  getAutomationRules(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/automation/rules`);
  }

  createAutomationRule(rule: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/automation/rules`, rule);
  }
}
