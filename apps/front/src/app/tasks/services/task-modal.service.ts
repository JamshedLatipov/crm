import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

export interface TaskModalConfig {
  title?: string;
  date?: Date;
  time?: string;
  leadId?: number;
  dealId?: string;
  showTime?: boolean;
  mode?: 'create' | 'edit';
  taskId?: number;
  note?: string; // optional prefilled note/description from callers
  callLogId?: string; // link to call log when task is created from call
}

@Injectable({
  providedIn: 'root'
})
export class TaskModalService {
  // Signal to control modal visibility and configuration
  public modalOpen = signal(false);
  public modalConfig = signal<TaskModalConfig>({});
  
  // Event emitter for when a task is created or updated
  public taskSaved$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private router: Router
  ) {}

  /**
   * Open the task creation/editing modal
   * @param config Configuration for the modal (date, time, leadId, etc.)
   */
  openModal(config: TaskModalConfig = {}) {
    this.modalConfig.set(config);
    this.modalOpen.set(true);
  }

  /**
   * Close the modal
   */
  closeModal() {
    this.modalOpen.set(false);
    // Reset config after a short delay to allow closing animation
    setTimeout(() => {
      this.modalConfig.set({});
    }, 300);
  }
  
  /**
   * Notify subscribers that a task was saved
   */
  notifyTaskSaved() {
    this.taskSaved$.next();
  }

  /**
   * Quick shortcut to open create modal with specific date/time
   */
  openCreateModal(date?: Date, hour?: number) {
    const config: TaskModalConfig = {
      mode: 'create',
      showTime: hour !== undefined,
    };
    
    if (date) {
      config.date = date;
    }
    
    if (hour !== undefined) {
      config.time = `${String(hour).padStart(2, '0')}:00`;
    }
    
    this.openModal(config);
  }

  /**
   * Open edit modal for existing task
   */
  openEditModal(taskId: number) {
    this.openModal({
      mode: 'edit',
      taskId,
    });
  }

  /**
   * Open task creation modal
   */
  openCreateTask(config: Partial<TaskModalConfig> = {}): Observable<any> {
    return new Observable(observer => {
      this.openModal({
        mode: 'create',
        ...config
      });
      
      const subscription = this.taskSaved$.subscribe(() => {
        observer.next(true);
        observer.complete();
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Open task edit modal
   */
  openEditTask(taskId: number): Observable<any> {
    return new Observable(observer => {
      this.openEditModal(taskId);
      
      const subscription = this.taskSaved$.subscribe(() => {
        observer.next(true);
        observer.complete();
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Open task detail view (navigate to detail page)
   */
  openTaskDetail(taskId: number): void {
    this.router.navigate(['/tasks', taskId]);
  }
}
