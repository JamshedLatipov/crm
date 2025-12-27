import { Component, OnInit, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSelectorComponent } from '../../../shared/components/user-selector/user-selector.component';
import { TaskTypeSelectComponent } from '../task-type-select.component';
import { TaskModalService } from '../../services/task-modal.service';
import { TasksService } from '../../tasks.service';
import { TaskTypeService, TaskType } from '../../../services/task-type.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    UserSelectorComponent,
    TaskTypeSelectComponent,
  ],
  templateUrl: './task-modal.component.html',
  styleUrls: ['./task-modal.component.scss'],
})
export class TaskModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(TaskModalService);
  private tasksService = inject(TasksService);
  private taskTypeService = inject(TaskTypeService);

  // Signals from service
  isOpen = this.modalService.modalOpen;
  config = this.modalService.modalConfig;

  form!: FormGroup;
  isSaving = signal(false);
  isLoading = signal(false);
  taskTypes: TaskType[] = [];
  calculatedDueDate: Date | null = null;

  statusOptions = [
    { value: 'pending', label: 'В ожидании' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'done', label: 'Завершено' },
  ];

  constructor() {
    // React to config changes
    effect(() => {
      const cfg = this.config();
      if (cfg && this.isOpen()) {
        this.initializeForm(cfg);
      }
    });
  }

  ngOnInit(): void {
    this.loadTaskTypes();
    this.form = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['pending', Validators.required],
      assignedToId: [null],
      taskTypeId: [null],
      dueDate: [null],
      autoCalculateDueDate: [false],
      leadId: [null],
      dealId: [null],
    });
  }

  private initializeForm(cfg: any): void {
    if (cfg.mode === 'edit' && cfg.taskId) {
      this.loadTask(cfg.taskId);
    } else {
      // Create mode
      const updates: any = {
        title: cfg.title || '',
        status: 'pending',
      };

      if (cfg.date) {
        updates.dueDate = cfg.date;
      }

      // Allow prefilled description/note from caller
      if (cfg.note || cfg.description) {
        updates.description = cfg.note || cfg.description;
      }

      if (cfg.leadId) {
        updates.leadId = cfg.leadId;
      }

      if (cfg.dealId) {
        updates.dealId = cfg.dealId;
      }

      this.form.patchValue(updates);
    }
  }

  private loadTaskTypes(): void {
    this.taskTypeService.getAll(false).subscribe({
      next: (types) => {
        this.taskTypes = types;
      },
      error: (err) => {
        console.error('Failed to load task types', err);
      },
    });
  }

  private loadTask(taskId: number): void {
    this.isLoading.set(true);
    this.tasksService.get(taskId).subscribe({
      next: (task) => {
        this.form.patchValue({
          title: task.title,
          description: task.description,
          status: task.status,
          assignedToId: task.assignedToId,
          taskTypeId: task.taskTypeId,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          leadId: task.leadId,
          dealId: task.dealId,
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load task', err);
        this.isLoading.set(false);
      },
    });
  }

  onTaskTypeChange(taskTypeId: number | null): void {
    if (!taskTypeId || !this.form.get('autoCalculateDueDate')?.value) {
      this.calculatedDueDate = null;
      return;
    }

    const taskType = this.taskTypes.find(t => t.id === taskTypeId);
    if (!taskType) {
      this.calculatedDueDate = null;
      return;
    }

    const now = new Date();
    const durationHours = taskType.timeFrameSettings?.defaultDuration || 24;
    this.calculatedDueDate = new Date(now.getTime() + durationHours * 3600000);
  }

  onAutoCalculateToggle(enabled: boolean): void {
    if (enabled) {
      const taskTypeId = this.form.get('taskTypeId')?.value;
      if (taskTypeId) {
        this.onTaskTypeChange(taskTypeId);
      }
    } else {
      this.calculatedDueDate = null;
    }
  }

  formatDate(date: Date): string {
    return format(date, 'dd MMMM yyyy, HH:mm', { locale: ru });
  }

  close(): void {
    this.modalService.closeModal();
    this.form.reset({
      status: 'pending',
      autoCalculateDueDate: false,
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    this.isSaving.set(true);
    const formValue = this.form.value;

    // Determine due date
    let dueDate: string;
    if (formValue.autoCalculateDueDate && this.calculatedDueDate) {
      dueDate = this.calculatedDueDate.toISOString();
    } else if (formValue.dueDate) {
      dueDate = new Date(formValue.dueDate).toISOString();
    } else {
      dueDate = new Date().toISOString();
    }

    const taskDto: any = {
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      dueDate,
      assignedToId: formValue.assignedToId,
      taskTypeId: formValue.taskTypeId,
      leadId: formValue.leadId,
      dealId: formValue.dealId,
    };

    // Link to call log if provided
    const cfg = this.config();
    if (cfg.callLogId) {
      taskDto.callLogId = cfg.callLogId;
    }

    const observable =
      cfg.mode === 'edit' && cfg.taskId
        ? this.tasksService.update(cfg.taskId, taskDto)
        : this.tasksService.create(taskDto);

    observable.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.modalService.notifyTaskSaved(); // Notify subscribers
        this.close();
      },
      error: (err) => {
        console.error('Failed to save task', err);
        this.isSaving.set(false);
      },
    });
  }
}
