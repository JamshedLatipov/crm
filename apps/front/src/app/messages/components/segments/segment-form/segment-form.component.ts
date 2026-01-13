import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SegmentService } from '../../../../shared/services/segment.service';
import { Segment, SegmentUsageType, FilterGroup, FilterCondition, isFilterGroup } from '../../../../shared/models/segment.models';
import { SegmentFilterGroupComponent } from '../segment-filter-group/segment-filter-group.component';

@Component({
  selector: 'app-segment-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatDividerModule,
    SegmentFilterGroupComponent,
  ],
  templateUrl: './segment-form.component.html',
  styleUrls: ['./segment-form.component.scss'],
})
export class SegmentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly segmentService = inject(SegmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Signals
  readonly isLoading = signal(false);
  readonly isEditMode = signal(false);
  readonly segmentId = signal<string | null>(null);
  readonly filterGroup = signal<FilterGroup>({
    conditions: []
  });

  // Form
  segmentForm!: FormGroup;

  // Usage types
  usageTypes = [
    { value: SegmentUsageType.SMS, label: 'SMS' },
    { value: SegmentUsageType.CAMPAIGN, label: 'Кампания' },
    { value: SegmentUsageType.EMAIL, label: 'Email' },
    { value: SegmentUsageType.WHATSAPP, label: 'WhatsApp' },
    { value: SegmentUsageType.TELEGRAM, label: 'Telegram' },
    { value: SegmentUsageType.GENERAL, label: 'Общий' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  private initForm(): void {
    this.segmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      usageType: [SegmentUsageType.SMS, Validators.required],
      isActive: [true],
      filters: [[]],
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.segmentId.set(id);
      this.loadSegment(id);
    }
  }

  private loadSegment(id: string): void {
    this.isLoading.set(true);
    this.segmentService.getById(id).subscribe({
      next: (segment) => {
        this.segmentForm.patchValue({
          name: segment.name,
          description: segment.description,
          usageType: segment.usageType,
          isActive: segment.isActive,
          filters: segment.filters || [],
        });
        
        // Convert old format to new FilterGroup format if needed
        if (Array.isArray(segment.filters)) {
          // Old format: array of filters with separate filterLogic
          // Конвертируем в новый формат с индивидуальными операторами
          const conditions: FilterCondition[] = segment.filters.map((filter, index) => ({
            item: filter,
            logicOperator: index === 0 ? 'AND' : (segment.filterLogic || 'AND')
          }));
          
          this.filterGroup.set({
            conditions: conditions
          });
        } else if (segment.filters && isFilterGroup(segment.filters)) {
          // New format: already a FilterGroup
          // Проверяем, есть ли новая структура с FilterCondition
          if (segment.filters.conditions.length > 0 && 
              'item' in segment.filters.conditions[0]) {
            // Уже новый формат с FilterCondition
            this.filterGroup.set(segment.filters);
          } else {
            // Старый формат FilterGroup (без FilterCondition)
            // Конвертируем
            const oldLogic = (segment.filters as any).logic || 'AND';
            const conditions: FilterCondition[] = (segment.filters.conditions as any[]).map((cond, index) => ({
              item: cond,
              logicOperator: index === 0 ? 'AND' : oldLogic
            }));
            
            this.filterGroup.set({
              conditions: conditions
            });
          }
        } else {
          // Empty filters
          this.filterGroup.set({
            conditions: []
          });
        }
        
        this.isLoading.set(false);
      },
      error: (error) => {
        this.snackBar.open('Ошибка загрузки сегмента', 'Закрыть', {
          duration: 3000,
        });
        this.isLoading.set(false);
        this.router.navigate(['/messages/segments']);
      },
    });
  }

  onSubmit(): void {
    if (this.segmentForm.invalid) {
      this.segmentForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const formValue = {
      ...this.segmentForm.value,
      filters: this.filterGroup()
    };

    if (this.isEditMode() && this.segmentId()) {
      // Update existing segment
      this.segmentService.update(this.segmentId()!, formValue).subscribe({
        next: () => {
          this.snackBar.open('Сегмент обновлен', 'Закрыть', { duration: 2000 });
          this.router.navigate(['/messages/segments']);
        },
        error: () => {
          this.snackBar.open('Ошибка обновления сегмента', 'Закрыть', {
            duration: 3000,
          });
          this.isLoading.set(false);
        },
      });
    } else {
      // Create new segment
      this.segmentService.create(formValue).subscribe({
        next: () => {
          this.snackBar.open('Сегмент создан', 'Закрыть', { duration: 2000 });
          this.router.navigate(['/messages/segments']);
        },
        error: () => {
          this.snackBar.open('Ошибка создания сегмента', 'Закрыть', {
            duration: 3000,
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/messages/segments']);
  }

  get title(): string {
    return this.isEditMode() ? 'Редактировать сегмент' : 'Создать сегмент';
  }

  get submitButtonText(): string {
    return this.isEditMode() ? 'Сохранить' : 'Создать';
  }

  // Filter group management
  onFilterGroupChange(updatedGroup: FilterGroup): void {
    this.filterGroup.set(updatedGroup);
  }
}
