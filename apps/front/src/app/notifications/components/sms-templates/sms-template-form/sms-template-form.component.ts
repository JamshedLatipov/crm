import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-sms-template-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatIconModule,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      [title]="templateId() ? 'Редактировать SMS шаблон' : 'Новый SMS шаблон'"
      [subtitle]="templateId() ? 'Изменение настроек шаблона' : 'Создание нового SMS шаблона'"
    >
      <div page-actions>
        <button mat-stroked-button (click)="cancel()">
          <mat-icon>close</mat-icon>
          Отмена
        </button>
        <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
          <mat-icon>save</mat-icon>
          Сохранить
        </button>
      </div>

      <div class="form-container">
        <div class="form-layout">
          <mat-card class="form-card">
            <form [formGroup]="form">
              <div class="form-section">
                <h3 class="section-title">
                  <mat-icon>info</mat-icon>
                  Основная информация
                </h3>
                
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Название шаблона</mat-label>
                  <input matInput formControlName="name" placeholder="Введите название">
                  <mat-icon matPrefix>label</mat-icon>
                  @if (form.get('name')?.hasError('required')) {
                    <mat-error>Название обязательно</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Содержимое SMS</mat-label>
                  <textarea 
                    matInput 
                    formControlName="content" 
                    rows="6" 
                    placeholder="Введите текст. Используйте {{'{{'}}variable{{'}}'}} для переменных"
                    (input)="updateCharCount()">
                  </textarea>
                  <mat-icon matPrefix>message</mat-icon>
                  <mat-hint align="start">Используйте {{'{{'}}переменная{{'}}'}} для динамического контента</mat-hint>
                  <mat-hint align="end">
                    <span [class.warning]="charCount() > 160">{{ charCount() }} / 160</span>
                  </mat-hint>
                  @if (form.get('content')?.hasError('required')) {
                    <mat-error>Содержимое обязательно</mat-error>
                  }
                </mat-form-field>

                <mat-slide-toggle formControlName="isActive" class="toggle-field">
                  <span class="toggle-label">
                    <mat-icon>{{ form.get('isActive')?.value ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ form.get('isActive')?.value ? 'Шаблон активен' : 'Шаблон неактивен' }}
                  </span>
                </mat-slide-toggle>
              </div>
            </form>
          </mat-card>

          <mat-card class="sidebar-card">
            <div class="sidebar-section">
              <h3 class="sidebar-title">
                <mat-icon>code</mat-icon>
                Переменные
              </h3>
              
              @if (detectedVariables().length > 0) {
                <div class="variables-list">
                  @for (variable of detectedVariables(); track variable) {
                    <div class="variable-item">
                      <mat-icon>bookmark</mat-icon>
                      <span>{{'{{'}}{{ variable }}{{'}}'}}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-variables">
                  <mat-icon>info</mat-icon>
                  <p>Переменные не обнаружены</p>
                  <small>Добавьте {{'{{'}}имя{{'}}'}} в текст</small>
                </div>
              }
            </div>

            <div class="sidebar-section">
              <h3 class="sidebar-title">
                <mat-icon>tips_and_updates</mat-icon>
                Подсказки
              </h3>
              <ul class="tips-list">
                <li>Используйте переменные для персонализации</li>
                <li>160 символов = 1 SMS сообщение</li>
                <li>Кириллица учитывается как 70 символов</li>
              </ul>
            </div>
          </mat-card>
        </div>
      </div>
    </app-page-layout>
  `,
  styles: [`
    .form-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .form-layout {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 24px;
      
      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .form-card,
    .sidebar-card {
      padding: 32px;
    }

    .form-section {
      margin-bottom: 32px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 24px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
      
      mat-icon {
        color: var(--primary-color);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .toggle-field {
      margin: 24px 0;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
    }

    .warning {
      color: #f59e0b;
      font-weight: 600;
    }

    .sidebar-section {
      margin-bottom: 32px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 16px 0;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--primary-color);
      }
    }

    .variables-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .variable-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #ede9fe;
      color: #7c3aed;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .empty-variables {
      text-align: center;
      padding: 24px 16px;
      background: #f9fafb;
      border-radius: 8px;
      
      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #9ca3af;
        margin-bottom: 8px;
      }
      
      p {
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #6b7280;
      }
      
      small {
        color: #9ca3af;
        font-size: 12px;
      }
    }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        padding: 8px 0;
        font-size: 13px;
        color: #6b7280;
        border-bottom: 1px solid #f3f4f6;
        
        &:last-child {
          border-bottom: none;
        }
        
        &::before {
          content: '💡';
          margin-right: 8px;
        }
      }
    }
  `]
})
export class SmsTemplateFormComponent implements OnInit {
  form!: FormGroup;
  templateId = signal<string | null>(null);
  charCount = signal(0);
  detectedVariables = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id);
    
    if (id && id !== 'new') {
      // TODO: Загрузить данные шаблона
    }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      content: ['', Validators.required],
      isActive: [true]
    });

    // Следим за изменениями контента
    this.form.get('content')?.valueChanges.subscribe(() => {
      this.updateCharCount();
      this.detectVariables();
    });
  }

  updateCharCount() {
    const content = this.form.get('content')?.value || '';
    this.charCount.set(content.length);
  }

  detectVariables() {
    const content = this.form.get('content')?.value || '';
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    const variables = matches.map(match => match[1]);
    this.detectedVariables.set([...new Set(variables)]);
  }

  save() {
    if (this.form.valid) {
      // TODO: Сохранить через сервис
      console.log('Saving template:', this.form.value);
      this.router.navigate(['/notifications/sms-templates']);
    }
  }

  cancel() {
    this.router.navigate(['/notifications/sms-templates']);
  }
}
