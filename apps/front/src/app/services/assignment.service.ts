import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '@crm/front/environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
  department?: string;
  workload: number;
  maxCapacity: number;
  workloadPercentage: number;
  isAvailable: boolean;
}

export interface AssignmentRequest {
  entityType: 'lead' | 'deal' | 'task' | 'notification';
  entityId: string | number;
  assignedTo: number[];
  assignedBy: number;
  reason?: string;
  notifyAssignees?: boolean;
}

export interface AssignmentResponse {
  success: boolean;
  assignmentId?: string;
  notificationsSent?: number;
  message?: string;
}

export interface AssignmentHistory {
  id: string;
  entityType: string;
  entityId: string | number;
  assignedTo: string[];
  assignedBy: string;
  assignedAt: Date;
  unassignedAt?: Date;
  reason?: string;
  status: 'active' | 'completed' | 'cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  // Public properties  
  public readonly users = signal<User[]>([]);
  public readonly assignments = signal<AssignmentHistory[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // Private properties
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/assignments`;
  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  private readonly assignmentsSubject = new BehaviorSubject<AssignmentHistory[]>([]);

  // Public observables
  public readonly users$ = this.usersSubject.asObservable();
  public readonly assignments$ = this.assignmentsSubject.asObservable();

  constructor() {
    this.loadUsers();
  }

  // Загрузка списка пользователей
  loadUsers(): Observable<User[]> {
    this.setLoading(true);
    
    return this.http.get<User[]>(`${this.baseUrl}/users`).pipe(
      tap(users => {
        this.users.set(users);
        this.usersSubject.next(users);
      }),
      catchError(() => {
        // Mock data для разработки
        const mockUsers: User[] = [
          { 
            id: 1, 
            name: 'Анна Иванова', 
            email: 'anna@company.com', 
            roles: ['sales_manager'], 
            department: 'Продажи', 
            workload: 8,
            maxCapacity: 15,
            workloadPercentage: 53,
            isAvailable: true 
          },
          { 
            id: 2, 
            name: 'Петр Петров', 
            email: 'petr@company.com', 
            roles: ['admin'], 
            department: 'IT', 
            workload: 3,
            maxCapacity: 10,
            workloadPercentage: 30,
            isAvailable: true 
          },
          { 
            id: 3, 
            name: 'Елена Сидорова', 
            email: 'elena@company.com', 
            roles: ['team_lead'], 
            department: 'Клиентский сервис', 
            workload: 12,
            maxCapacity: 15,
            workloadPercentage: 80,
            isAvailable: true 
          },
          { 
            id: 4, 
            name: 'Сергей Козлов', 
            email: 'sergey@company.com', 
            roles: ['account_manager'], 
            department: 'Продажи', 
            workload: 5,
            maxCapacity: 12,
            workloadPercentage: 42,
            isAvailable: true 
          },
          { 
            id: 5, 
            name: 'Мария Николаева', 
            email: 'maria@company.com', 
            roles: ['senior_manager'], 
            department: 'Продажи', 
            workload: 15,
            maxCapacity: 15,
            workloadPercentage: 100,
            isAvailable: false 
          }
        ];
        
        this.users.set(mockUsers);
        this.usersSubject.next(mockUsers);
        return of(mockUsers);
      }),
      tap(() => this.setLoading(false))
    );
  }

  // Назначение ответственных
  assignResponsible(request: AssignmentRequest): Observable<AssignmentResponse> {
    this.setLoading(true);
    this.setError(null);

    return this.http.post<AssignmentResponse>(`${this.baseUrl}/`, request).pipe(
      tap(response => {
        if (response.success) {
          // Обновляем локальное состояние
          this.loadAssignmentHistory(request.entityType, request.entityId);
          
          // Создаем уведомления для назначенных пользователей
          if (request.notifyAssignees !== false) {
            this.createAssignmentNotifications(request);
          }
        }
      }),
      catchError(() => {
        this.setError('Не удалось назначить ответственных');
        // Mock response для разработки
        return of({
          success: true,
          assignmentId: `mock-${Date.now()}`,
          notificationsSent: request.assignedTo.length,
          message: 'Ответственные назначены (mock)'
        });
      }),
      tap(() => this.setLoading(false))
    );
  }

  // Снятие назначения
  unassignResponsible(
    entityType: string, 
    entityId: string | number, 
    userIds: string[], 
    reason?: string
  ): Observable<AssignmentResponse> {
    const request = {
      entityType,
      entityId,
      userIds,
      reason
    };

    return this.http.delete<AssignmentResponse>(`${this.baseUrl}/`, { body: request }).pipe(
      tap(response => {
        if (response.success) {
          this.loadAssignmentHistory(entityType, entityId);
        }
      }),
      catchError(() => {
        this.setError('Не удалось снять назначение');
        return of({ success: false });
      })
    );
  }

  // Получение истории назначений
  loadAssignmentHistory(entityType: string, entityId: string | number): Observable<AssignmentHistory[]> {
    return this.http.get<AssignmentHistory[]>(
      `${this.baseUrl}/history/${entityType}/${entityId}`
    ).pipe(
      tap(assignments => {
        this.assignments.set(assignments);
        this.assignmentsSubject.next(assignments);
      }),
      catchError(() => {
        // Mock data
        const mockAssignments: AssignmentHistory[] = [
          {
            id: '1',
            entityType,
            entityId,
            assignedTo: ['1', '2'],
            assignedBy: 'current-user',
            assignedAt: new Date(),
            reason: 'Высокий приоритет',
            status: 'active'
          }
        ];
        
        this.assignments.set(mockAssignments);
        this.assignmentsSubject.next(mockAssignments);
        return of(mockAssignments);
      })
    );
  }

  // Получение текущих назначений для сущности
  getCurrentAssignments(entityType: string, entityId: string | number): Observable<User[]> {
    return this.http.get<number[]>(`${this.baseUrl}/current/${entityType}/${entityId}`).pipe(
      map(userIds => this.users().filter(user => userIds.includes(user.id))),
      catchError(() => of([]))
    );
  }

  // Batch: получение текущих назначений для нескольких сущностей
  getCurrentAssignmentsForEntities(entityType: string, entityIds: (string | number)[]): Observable<Record<string, { id: number; name: string; email?: string; assignedAt?: string }>> {
    if (!entityIds || entityIds.length === 0) return of({});
    return this.http.post<any>(`${this.baseUrl}/current/batch`, { entityType, entityIds }).pipe(
      catchError(() => of({}))
    );
  }

  // Поиск пользователей
  searchUsers(query: string, filters?: { role?: string; department?: string }): User[] {
    const allUsers = this.users();
    const lowerQuery = query.toLowerCase();

    return allUsers.filter(user => {
      const matchesQuery = !query || 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery);

      const matchesRole = !filters?.role || 
        user.roles.some(role => role.toLowerCase().includes(filters.role?.toLowerCase() || ''));

      const matchesDepartment = !filters?.department || 
        user.department?.toLowerCase().includes(filters.department.toLowerCase());

      return matchesQuery && matchesRole && matchesDepartment && user.isAvailable;
    });
  }

  // Получение пользователей по роли
  getUsersByRole(role: string): User[] {
    return this.users().filter(user => 
      user.roles.some(r => r.toLowerCase().includes(role.toLowerCase())) && user.isAvailable
    );
  }

  // Получение пользователей по департаменту
  getUsersByDepartment(department: string): User[] {
    return this.users().filter(user => 
      user.department?.toLowerCase().includes(department.toLowerCase()) && user.isAvailable
    );
  }

  // Получение информации о пользователе
  getUserInfo(userId: number): User | null {
    return this.users().find(user => user.id === userId) || null;
  }

  // Создание уведомлений о назначении
  private createAssignmentNotifications(request: AssignmentRequest): void {
    const notifications = request.assignedTo.map(userId => ({
      type: 'ASSIGNMENT_NOTIFICATION',
      title: `Вам назначена новая задача`,
      message: this.getAssignmentMessage(request),
      channel: 'IN_APP',
      priority: 'MEDIUM',
      recipientId: userId,
      data: {
        entityType: request.entityType,
        entityId: request.entityId,
        assignedBy: request.assignedBy,
        reason: request.reason,
        actionUrl: this.getEntityUrl(request.entityType, request.entityId)
      }
    }));

    // Отправляем уведомления через NotificationService
    // В реальном приложении нужно инжектить NotificationService
    console.log('Creating assignment notifications:', notifications);
  }

  private getAssignmentMessage(request: AssignmentRequest): string {
    const entityName = this.getEntityDisplayName(request.entityType);
    return `Вам назначен ${entityName} #${request.entityId}. ${request.reason ? `Причина: ${request.reason}` : ''}`;
  }

  private getEntityDisplayName(entityType: string): string {
    const names: Record<string, string> = {
      'lead': 'лид',
      'deal': 'сделка', 
      'task': 'задача',
      'notification': 'уведомление'
    };
    return names[entityType] || entityType;
  }

  private getEntityUrl(entityType: string, entityId: string | number): string {
    const routes: Record<string, string> = {
      'lead': '/leads',
      'deal': '/deals',
      'task': '/tasks',
      'notification': '/notifications'
    };
    return `${routes[entityType] || '/'}/${entityId}`;
  }

  private setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  private setError(error: string | null): void {
    this.error.set(error);
  }
}