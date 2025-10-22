import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@crm/front/environments/environment';

export interface TimeFrameSettings {
  defaultDuration?: number;
  minDuration?: number;
  maxDuration?: number;
  warningBeforeDeadline?: number;
  reminderBeforeDeadline?: number;
  allowNoDueDate?: boolean;
  workingDays?: number[];
  workingHours?: {
    start: string;
    end: string;
  };
  skipWeekends?: boolean;
  slaResponseTime?: number;
  slaResolutionTime?: number;
}

export interface TaskType {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  timeFrameSettings?: TimeFrameSettings;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskTypeDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  timeFrameSettings?: TimeFrameSettings;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateTaskTypeDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  timeFrameSettings?: TimeFrameSettings;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskTypeService {
  private apiUrl = environment.apiBase + '/task-types';

  constructor(private http: HttpClient) {}

  /**
   * Получить все типы задач
   */
  getAll(includeInactive = false): Observable<TaskType[]> {
    return this.http.get<TaskType[]>(`${this.apiUrl}?includeInactive=${includeInactive}`);
  }

  /**
   * Получить тип задачи по ID
   */
  getById(id: number): Observable<TaskType> {
    return this.http.get<TaskType>(`${this.apiUrl}/${id}`);
  }

  /**
   * Создать новый тип задачи
   */
  create(dto: CreateTaskTypeDto): Observable<TaskType> {
    return this.http.post<TaskType>(this.apiUrl, dto);
  }

  /**
   * Обновить тип задачи
   */
  update(id: number, dto: UpdateTaskTypeDto): Observable<TaskType> {
    return this.http.put<TaskType>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Деактивировать тип задачи
   */
  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Полностью удалить тип задачи
   */
  forceRemove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/force`);
  }

  /**
   * Изменить порядок типов задач
   */
  reorder(orderedIds: number[]): Observable<TaskType[]> {
    return this.http.post<TaskType[]>(`${this.apiUrl}/reorder`, { orderedIds });
  }

  /**
   * Рассчитать дедлайн на основе типа задачи
   */
  calculateDueDate(id: number, startDate?: Date): Observable<{ dueDate: Date | null }> {
    return this.http.post<{ dueDate: Date | null }>(
      `${this.apiUrl}/${id}/calculate-due-date`,
      { startDate: startDate?.toISOString() }
    );
  }

  /**
   * Валидировать временные рамки
   */
  validateTimeFrame(id: number, duration: number): Observable<{ valid: boolean; message?: string }> {
    return this.http.post<{ valid: boolean; message?: string }>(
      `${this.apiUrl}/${id}/validate-timeframe`,
      { duration }
    );
  }

  /**
   * Получить активные типы задач для селектора
   */
  getActiveForSelect(): Observable<Array<{ value: number; label: string; color?: string; icon?: string }>> {
    return new Observable(observer => {
      this.getAll(false).subscribe({
        next: (types) => {
          const options = types
            .filter(t => t.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(t => ({
              value: t.id,
              label: t.name,
              color: t.color,
              icon: t.icon
            }));
          observer.next(options);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Получить настройки по умолчанию для типа
   */
  getDefaultSettings(id: number): Observable<TimeFrameSettings | null> {
    return new Observable(observer => {
      this.getById(id).subscribe({
        next: (type) => {
          observer.next(type.timeFrameSettings || null);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
