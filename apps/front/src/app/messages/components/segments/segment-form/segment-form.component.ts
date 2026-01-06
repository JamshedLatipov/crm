import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-segment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="segment-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            {{ segmentId() ? 'Редактировать сегмент' : 'Новый сегмент' }}
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Название сегмента</mat-label>
              <input matInput formControlName="name" placeholder="Введите название">
              @if (form.get('name')?.hasError('required')) {
                <mat-error>Название обязательно</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Описание</mat-label>
              <textarea matInput formControlName="description" rows="3"></textarea>
            </mat-form-field>

            <div class="filters-section">
              <div class="section-header">
                <h3>Фильтры</h3>
                <button mat-mini-fab color="primary" type="button" (click)="addFilter()">
                  <mat-icon>add</mat-icon>
                </button>
              </div>

              <div formArrayName="filters">
                @for (filter of filters.controls; track filter; let i = $index) {
                  <mat-card class="filter-card" [formGroupName]="i">
                    <div class="filter-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Поле</mat-label>
                        <mat-select formControlName="field">
                          <mat-option value="name">Имя</mat-option>
                          <mat-option value="email">Email</mat-option>
                          <mat-option value="phone">Телефон</mat-option>
                          <mat-option value="status">Статус</mat-option>
                          <mat-option value="created_at">Дата создания</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Оператор</mat-label>
                        <mat-select formControlName="operator">
                          <mat-option value="equals">Равно</mat-option>
                          <mat-option value="not_equals">Не равно</mat-option>
                          <mat-option value="contains">Содержит</mat-option>
                          <mat-option value="not_contains">Не содержит</mat-option>
                          <mat-option value="starts_with">Начинается с</mat-option>
                          <mat-option value="ends_with">Заканчивается на</mat-option>
                          <mat-option value="greater">Больше</mat-option>
                          <mat-option value="less">Меньше</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Значение</mat-label>
                        <input matInput formControlName="value" placeholder="Введите значение">
                      </mat-form-field>

                      <button mat-icon-button color="warn" type="button" (click)="removeFilter(i)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </mat-card>
                }
              </div>

              @if (filters.length === 0) {
                <p class="no-filters">Фильтры не добавлены. Нажмите "+" чтобы добавить.</p>
              }
            </div>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="cancel()">Отмена</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
            Сохранить
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .segment-form-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .filters-section {
      margin: 24px 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .filter-card {
      margin-bottom: 16px;
      padding: 16px;
    }

    .filter-row {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .filter-row mat-form-field {
      flex: 1;
    }

    .no-filters {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 24px;
    }
  `]
})
export class SegmentFormComponent implements OnInit {
  form!: FormGroup;
  segmentId = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  get filters(): FormArray {
    return this.form.get('filters') as FormArray;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.segmentId.set(id);
    
    if (id && id !== 'new') {
      // TODO: Загрузить данные сегмента
    }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      filters: this.fb.array([])
    });
  }

  addFilter() {
    const filterGroup = this.fb.group({
      field: ['', Validators.required],
      operator: ['equals', Validators.required],
      value: ['', Validators.required]
    });
    this.filters.push(filterGroup);
  }

  removeFilter(index: number) {
    this.filters.removeAt(index);
  }

  save() {
    if (this.form.valid) {
      // TODO: Сохранить через сервис
      console.log('Saving segment:', this.form.value);
      this.router.navigate(['/notifications/segments']);
    }
  }

  cancel() {
    this.router.navigate(['/notifications/segments']);
  }
}
