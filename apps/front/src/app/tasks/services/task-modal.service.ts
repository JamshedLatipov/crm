import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

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
}
