import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'edit' ? 'Редактировать службу' : 'Новая служба' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <div class="row">
          <mat-form-field appearance="outline"
            ><mat-label>Название (name)</mat-label
            ><input matInput formControlName="name" required
          /></mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline"
            ><mat-label>Описание</mat-label
            ><input matInput formControlName="description"
          /></mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline"
            ><mat-label>Context</mat-label
            ><input matInput formControlName="context"
          /></mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Стратегия</mat-label>
            <mat-select formControlName="strategy">
              <mat-option *ngFor="let s of strategies" [value]="s.value">{{ s.label }}</mat-option>
            </mat-select>
            <mat-hint>{{ getStrategyHint() }}</mat-hint>
          </mat-form-field>
        </div>
        <div class="row">
          <mat-form-field appearance="outline"
            ><mat-label>Music class</mat-label
            ><input matInput formControlName="musicclass"
          /></mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline"
            ><mat-label>Maxlen</mat-label
            ><input matInput type="number" formControlName="maxlen"
          /></mat-form-field>
          <mat-form-field appearance="outline"
            ><mat-label>Timeout (s)</mat-label
            ><input matInput type="number" formControlName="timeout"
          /></mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline"
            ><mat-label>Retry</mat-label
            ><input matInput type="number" formControlName="retry"
          /></mat-form-field>
          <mat-form-field appearance="outline"
            ><mat-label>Wrapup (s)</mat-label
            ><input matInput type="number" formControlName="wrapuptime"
          /></mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline"
            ><mat-label>Announce freq (s)</mat-label
            ><input matInput type="number" formControlName="announce_frequency"
          /></mat-form-field>
          <div class="row">
            <mat-slide-toggle formControlName="ringinuse">Ring in use</mat-slide-toggle>
          </div>
        </div>
        <div class="row check">
          <mat-slide-toggle formControlName="joinempty">Join empty</mat-slide-toggle>
          <mat-slide-toggle formControlName="leavewhenempty">Leave when empty</mat-slide-toggle>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Отмена</button>
        <button mat-flat-button color="primary" type="submit">
          {{ data.mode === 'edit' ? 'Сохранить' : 'Создать' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .row {
        margin-bottom: 12px;
      }
      .two {
        display: flex;
        gap: 8px;
      }
      .check {
        display: flex;
        gap: 16px;
        align-items: center;
      }
    `,
  ],
})
export class QueueFormDialogComponent {
  form: FormGroup;
  data: QueueFormData = inject(MAT_DIALOG_DATA);
  private fb: FormBuilder = inject(FormBuilder);
  public dialogRef: MatDialogRef<QueueFormDialogComponent> =
    inject(MatDialogRef);

  strategies = [
    { value: 'ringall', label: 'Прозвон всех (ringall)', hint: 'Звонятся все агенты одновременно.' },
    { value: 'rrmemory', label: 'Round-robin с памятью (rrmemory)', hint: 'Распределение по очереди, помнит, кто уже звонил.' },
    { value: 'leastrecent', label: 'Наименее недавно (leastrecent)', hint: 'Приоритет тем, кто дольше не звонил.' },
    { value: 'fewestcalls', label: 'Меньше всего звонков (fewestcalls)', hint: 'Отдает приоритет агентам с наименьшим числом звонков.' },
    { value: 'random', label: 'Случайный (random)', hint: 'Выбирает случайного доступного агента.' },
    { value: 'rrordered', label: 'Round-robin упорядоченный (rrordered)', hint: 'Пошаговый round-robin без запоминания.' },
    { value: 'linear', label: 'Линейный (linear)', hint: 'Перебор агентов в заданном порядке.' },
  ];

  getStrategyHint(): string {
    try {
      const val = this.form?.get('strategy')?.value;
      const s = this.strategies.find((x: any) => x.value === val);
      return s?.hint || '';
    } catch {
      return '';
    }
  }

  constructor() {
    const p = this.data?.payload || {};
    this.form = this.fb.group({
      name: [p.name || ''],
      description: [p.description || ''],
      context: [p.context || ''],
      strategy: [p.strategy || ''],
      musicclass: [p.musicclass || ''],
      maxlen: [p.maxlen ?? 0],
      timeout: [p.timeout ?? 15],
      retry: [p.retry ?? 0],
      wrapuptime: [p.wrapuptime ?? 0],
      announce_frequency: [p.announce_frequency ?? 0],
      joinempty: [p.joinempty ?? true],
      leavewhenempty: [p.leavewhenempty ?? true],
      ringinuse: [p.ringinuse ?? false],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close({ confirmed: true, value: this.form.value });
    }
  }

  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }
}
