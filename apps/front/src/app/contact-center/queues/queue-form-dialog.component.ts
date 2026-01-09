import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface QueueFormData {
  mode?: 'create' | 'edit';
  payload?: any;
}

@Component({
  standalone: true,
  selector: 'app-queue-form-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './queue-form-dialog.component.html',
  styleUrl: './queue-form-dialog.component.scss',
})
export class QueueFormDialogComponent {
  form: FormGroup;
  data: QueueFormData = inject(MAT_DIALOG_DATA);
  private fb: FormBuilder = inject(FormBuilder);
  public dialogRef: MatDialogRef<QueueFormDialogComponent> = inject(MatDialogRef);

  strategies = [
    { 
      value: 'ringall', 
      label: 'Прозвон всех (ringall)', 
      hint: 'Звонятся все доступные агенты одновременно до тех пор, пока кто-то не ответит.'
    },
    { 
      value: 'rrmemory', 
      label: 'Round-robin с памятью (rrmemory)', 
      hint: 'Циклическое распределение звонков. Запоминает последнего звонившего агента и продолжает с него.'
    },
    { 
      value: 'leastrecent', 
      label: 'Наименее недавний (leastrecent)', 
      hint: 'Приоритет отдается агенту, который дольше всех не принимал звонки.'
    },
    { 
      value: 'fewestcalls', 
      label: 'Меньше всего звонков (fewestcalls)', 
      hint: 'Приоритет агентам с наименьшим количеством принятых звонков.'
    },
    { 
      value: 'random', 
      label: 'Случайный (random)', 
      hint: 'Выбирает случайного доступного агента для каждого звонка.'
    },
    { 
      value: 'rrordered', 
      label: 'Round-robin упорядоченный (rrordered)', 
      hint: 'Циклическое распределение в заданном порядке без запоминания позиции.'
    },
    { 
      value: 'linear', 
      label: 'Линейный (linear)', 
      hint: 'Последовательный перебор агентов в порядке их добавления в очередь.'
    },
  ];

  constructor() {
    const p = this.data?.payload || {};
    this.form = this.fb.group({
      name: [p.name || '', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      description: [p.description || ''],
      context: [p.context || ''],
      strategy: [p.strategy || 'ringall'],
      musicclass: [p.musicclass || 'default'],
      maxlen: [p.maxlen ?? 0, [Validators.min(0)]],
      timeout: [p.timeout ?? 15, [Validators.min(0)]],
      retry: [p.retry ?? 5, [Validators.min(0)]],
      wrapuptime: [p.wrapuptime ?? 0, [Validators.min(0)]],
      announce_frequency: [p.announce_frequency ?? 0, [Validators.min(0)]],
      joinempty: [p.joinempty ?? true],
      leavewhenempty: [p.leavewhenempty ?? true],
      ringinuse: [p.ringinuse ?? false],
    });
  }

  getStrategyHint(): string {
    try {
      const val = this.form?.get('strategy')?.value;
      const s = this.strategies.find((x) => x.value === val);
      return s?.hint || 'Выберите стратегию распределения вызовов';
    } catch {
      return 'Выберите стратегию распределения вызовов';
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close({ confirmed: true, value: this.form.value });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }
}
