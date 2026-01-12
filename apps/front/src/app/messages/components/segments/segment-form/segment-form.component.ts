import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { MessageBackButtonComponent } from '../../shared/message-back-button/message-back-button.component';
import { SegmentService } from '../../../services/segment.service';
import { CreateSegmentDto } from '../../../models/message.models';

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
    MatIconModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    PageLayoutComponent,
    MessageBackButtonComponent
  ],
  templateUrl: './segment-form.component.html',
  styleUrl: './segment-form.component.scss'
})
export class SegmentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly segmentService = inject(SegmentService);
  private readonly snackBar = inject(MatSnackBar);

  form!: FormGroup;
  templateId = signal<string | null>(null);
  loading = signal(false);

  // Маппинг для читаемых названий полей
  fieldLabels: Record<string, string> = {
    'name': 'Имя',
    'email': 'Email',
    'phone': 'Телефон',
    'status': 'Статус',
    'createdAt': 'Дата создания',
    'lastContactedAt': 'Последний контакт',
    'tags': 'Теги'
  };

  // Маппинг для операторов
  operatorLabels: Record<string, string> = {
    'equals': '=',
    'notEquals': '≠',
    'contains': 'содержит',
    'notContains': 'не содержит',
    'startsWith': 'начинается с',
    'endsWith': 'заканчивается на',
    'greater': '>',
    'less': '<',
    'between': 'между',
    'in': 'в списке',
    'notIn': 'не в списке'
  };

  get filters(): FormArray {
    return this.form.get('filters') as FormArray;
  }

  ngOnInit() {
    this.initForm();
    
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id);
    
    if (id && id !== 'new') {
      this.loadSegment(id);
    }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      filterLogic: ['AND'],
      isDynamic: [true],
      filters: this.fb.array([])
    });
  }

  loadSegment(id: string) {
    this.loading.set(true);
    this.segmentService.getById(id).subscribe({
      next: (segment) => {
        this.form.patchValue({
          name: segment.name,
          description: segment.description,
          filterLogic: segment.filterLogic,
          isDynamic: segment.isDynamic
        });

        // Очистить и добавить фильтры
        this.filters.clear();
        segment.filters.forEach(filter => {
          this.filters.push(this.fb.group({
            field: [filter.field, Validators.required],
            operator: [filter.operator, Validators.required],
            value: [filter.value, Validators.required]
          }));
        });

        this.loading.set(false);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка загрузки сегмента',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
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

  getFieldLabel(field: string): string {
    return this.fieldLabels[field] || field;
  }

  getOperatorLabel(operator: string): string {
    return this.operatorLabels[operator] || operator;
  }

  save() {
    if (this.form.invalid) {
      this.snackBar.open('Заполните все обязательные поля', 'Закрыть', { duration: 3000 });
      return;
    }

    const dto: CreateSegmentDto = {
      name: this.form.value.name,
      description: this.form.value.description,
      filters: this.form.value.filters,
      filterLogic: this.form.value.filterLogic,
      isDynamic: this.form.value.isDynamic
    };

    this.loading.set(true);

    const operation = this.templateId() 
      ? this.segmentService.update(this.templateId()!, dto)
      : this.segmentService.create(dto);

    operation.subscribe({
      next: () => {
        this.snackBar.open(
          this.templateId() ? 'Сегмент успешно обновлен!' : 'Сегмент успешно создан!',
          'Закрыть',
          { duration: 3000 }
        );
        this.router.navigate(['/messages/segments']);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка сохранения сегмента',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/messages/segments']);
  }
}
