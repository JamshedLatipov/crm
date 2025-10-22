import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TasksService } from '../tasks.service';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { UserSelectorComponent } from '../../shared/components/user-selector/user-selector.component';
import { LeadService } from '../../leads/services/lead.service';
import { DealsService } from '../../pipeline/deals.service';
import { Observable, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { TaskTypeService, TaskType } from '../../services/task-type.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TaskTypeSelectComponent } from '../components/task-type-select.component';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    UserSelectorComponent,
    // Task type select component
    TaskTypeSelectComponent
  ],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tasks = inject(TasksService);
  private leadService = inject(LeadService);
  private dealsService = inject(DealsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private taskTypeService = inject(TaskTypeService);

  form!: FormGroup;
  isEdit = false;
  id?: number;
  leadId?: number;
  dealId?: string;
  isLoading = false;
  isSaving = false;
  calculatedDueDate: Date | null = null;
  
  // Списки для селекторов
  leads: any[] = [];
  deals: any[] = [];
  taskTypes: TaskType[] = [];
  filteredLeads$!: Observable<any[]>;
  filteredDeals$!: Observable<any[]>;
  
  statusOptions = [
    { value: 'pending', label: 'В ожидании' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'done', label: 'Завершено' },
    { value: 'overdue', label: 'Просрочено' }
  ];

  // Форматирование даты в человеческом виде
  formatDate(date: Date | null): string {
    if (!date) return '';
    try {
      return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toLocaleString('ru-RU');
    }
  }

  ngOnInit() {
    this.initializeForm();
    
    // Загружаем типы задач
    this.loadTaskTypes();
    
    // Получаем leadId и dealId из query параметров
    this.route.queryParamMap.subscribe(params => {
      const leadIdParam = params.get('leadId');
      const dealIdParam = params.get('dealId');
      
      if (leadIdParam) {
        this.leadId = Number(leadIdParam);
        this.form.patchValue({ leadId: this.leadId });
      }
      
      if (dealIdParam) {
        this.dealId = dealIdParam;
        this.form.patchValue({ dealId: this.dealId });
      }
    });
    
    // Загружаем лиды и сделки (они сами обновят отображение после загрузки)
    this.loadLeads();
    this.loadDeals();
    
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('taskId');
    if (idParam) {
      this.isEdit = true;
      this.id = Number(idParam);
      this.loadTask();
    }
  }
  
  loadTaskTypes() {
    this.taskTypeService.getAll(false).subscribe({
      next: (types) => {
        this.taskTypes = types.sort((a, b) => a.sortOrder - b.sortOrder);
      },
      error: (err) => {
        console.error('Error loading task types:', err);
        this.snackBar.open('Ошибка загрузки типов задач', 'Закрыть', { duration: 3000 });
      }
    });
  }
  
  onTaskTypeChange(taskTypeId: number | null) {
    if (!taskTypeId) {
      this.form.patchValue({ autoCalculateDueDate: false });
      this.calculatedDueDate = null;
      return;
    }
    
    // Автоматически включаем тоггл если есть тип задачи
    const selectedType = this.taskTypes.find(t => t.id === taskTypeId);
    if (selectedType?.timeFrameSettings?.defaultDuration) {
      this.form.patchValue({ autoCalculateDueDate: true }, { emitEvent: false });
      this.calculateDueDate(taskTypeId);
    }
  }

  onAutoCalculateToggle(checked: boolean) {
    if (checked) {
      const taskTypeId = this.form.get('taskTypeId')?.value;
      if (taskTypeId) {
        this.calculateDueDate(taskTypeId);
      }
    } else {
      this.calculatedDueDate = null;
      this.form.patchValue({ dueDate: null });
    }
  }

  private calculateDueDate(taskTypeId: number) {
    this.taskTypeService.calculateDueDate(taskTypeId).subscribe({
      next: (result) => {
        if (result.dueDate) {
          this.calculatedDueDate = new Date(result.dueDate);
          this.snackBar.open('Дедлайн рассчитан автоматически', 'ОК', { duration: 2000 });
        }
      },
      error: (err) => {
        console.error('Error calculating due date:', err);
        this.snackBar.open('Ошибка расчета дедлайна', 'Закрыть', { duration: 3000 });
      }
    });
  }
  
  initializeForm() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['pending', Validators.required],
      assignedToId: [null],
      dueDate: [null],
      taskTypeId: [null],
      autoCalculateDueDate: [false],
      leadId: [null],
      dealId: [null],
      leadSearch: [''],
      dealSearch: ['']
    });

    // Настройка автокомплита для лидов
    this.filteredLeads$ = this.form.get('leadSearch')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterLeads(value || ''))
    );

    // Настройка автокомплита для сделок
    this.filteredDeals$ = this.form.get('dealSearch')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterDeals(value || ''))
    );
  }

  loadLeads() {
    this.leadService.getLeads().pipe(
      catchError(err => {
        console.error('Error loading leads:', err);
        return of({ leads: [] });
      })
    ).subscribe(response => {
      this.leads = response.leads || [];
      // После загрузки лидов обновляем отображение, если есть leadId
      if (this.leadId) {
        const leadName = this.displayLeadFn(this.leadId);
        if (leadName) {
          this.form.patchValue({ leadSearch: leadName }, { emitEvent: false });
        }
      }
    });
  }

  loadDeals() {
    this.dealsService.listDeals().pipe(
      catchError(err => {
        console.error('Error loading deals:', err);
        return of([]);
      })
    ).subscribe(deals => {
      // Может вернуться массив или объект с items
      this.deals = Array.isArray(deals) ? deals : (deals as any).items || [];
      // После загрузки сделок обновляем отображение, если есть dealId
      if (this.dealId) {
        const dealTitle = this.displayDealFn(this.dealId);
        if (dealTitle) {
          this.form.patchValue({ dealSearch: dealTitle }, { emitEvent: false });
        }
      }
    });
  }

  private _filterLeads(value: string | any): any[] {
    if (!value) return this.leads;
    if (typeof value !== 'string') return this.leads;
    const filterValue = value.toLowerCase();
    return this.leads.filter(lead => 
      lead.name?.toLowerCase().includes(filterValue) ||
      lead.email?.toLowerCase().includes(filterValue)
    );
  }

  private _filterDeals(value: string | any): any[] {
    if (!value) return this.deals;
    if (typeof value !== 'string') return this.deals;
    const filterValue = value.toLowerCase();
    return this.deals.filter(deal => 
      deal.title?.toLowerCase().includes(filterValue)
    );
  }

  onLeadSelected(lead: any) {
    this.form.patchValue({ 
      leadId: lead.id,
      leadSearch: lead.name // Отображаем имя лида в поле
    });
  }

  onDealSelected(deal: any) {
    this.form.patchValue({ 
      dealId: deal.id,
      dealSearch: deal.title // Отображаем название сделки в поле
    });
  }

  displayLeadFn(leadId: number): string {
    if (!leadId) return '';
    const lead = this.leads.find(l => l.id === leadId);
    return lead ? lead.name : '';
  }

  displayDealFn(dealId: string): string {
    if (!dealId) return '';
    const deal = this.deals.find(d => d.id === dealId);
    return deal ? deal.title : '';
  }
  
  loadTask() {
    if (!this.id) return;
    
    this.isLoading = true;
    this.tasks.get(this.id).subscribe({
      next: (task) => {
        console.log('TaskForm: Loaded task:', task);
        
        // Извлекаем ID из объекта assignedTo, если он есть
        const assignedToId = task.assignedTo?.id || task.assignedToId || null;
        console.log('TaskForm: assignedToId extracted:', assignedToId);
        
        // Устанавливаем имена для leadSearch и dealSearch
        const leadSearchValue = task.lead?.name || this.displayLeadFn(task.leadId);
        const dealSearchValue = task.deal?.title || this.displayDealFn(task.dealId);
        
        this.form.patchValue({
          title: task.title,
          description: task.description,
          status: task.status || 'pending',
          assignedToId: assignedToId,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          taskTypeId: task.taskTypeId || null,
          autoCalculateDueDate: false, // При редактировании по умолчанию выключен
          leadId: task.leadId || null,
          dealId: task.dealId || null,
          leadSearch: leadSearchValue,
          dealSearch: dealSearchValue
        });
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading task:', err);
        this.snackBar.open('Ошибка загрузки задачи', 'OK', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  save() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }
    
    this.isSaving = true;
    const formValue = this.form.value;
    
    // Подготовка DTO - убираем поля поиска
    const dto: any = {
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      assignedToId: formValue.assignedToId,
      taskTypeId: formValue.taskTypeId,
      leadId: formValue.leadId,
      dealId: formValue.dealId
    };
    
    // Используем рассчитанный дедлайн или введенный вручную
    if (formValue.autoCalculateDueDate && this.calculatedDueDate) {
      dto.dueDate = this.calculatedDueDate.toISOString();
    } else if (formValue.dueDate) {
      dto.dueDate = new Date(formValue.dueDate).toISOString();
    }

    console.log('Saving task with data:', dto);
    
    const operation = this.isEdit && this.id
      ? this.tasks.update(this.id, dto)
      : this.tasks.create(dto);
    
    operation.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEdit ? 'Задача обновлена' : 'Задача создана',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        console.error('Error saving task:', err);
        this.snackBar.open('Ошибка сохранения задачи', 'OK', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/tasks']);
  }
  
  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.touched) return '';
    
    if (control.hasError('required')) return 'Это поле обязательно';
    if (control.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `Минимум ${minLength} символов`;
    }
    
    return '';
  }
}
