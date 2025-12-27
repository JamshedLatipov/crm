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
    MatIconModule
  ],
  template: `
    <div class="template-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            {{ templateId() ? 'Редактировать SMS шаблон' : 'Новый SMS шаблон' }}
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Название шаблона</mat-label>
              <input matInput formControlName="name" placeholder="Введите название">
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
              <mat-hint align="end">{{ charCount() }} / 160 символов</mat-hint>
              @if (form.get('content')?.hasError('required')) {
                <mat-error>Содержимое обязательно</mat-error>
              }
            </mat-form-field>

            <div class="variables-section">
              <h3>Обнаруженные переменные:</h3>
              <div class="variables-list">
                @for (variable of detectedVariables(); track variable) {
                  <mat-chip>{{ variable }}</mat-chip>
                }
                @if (detectedVariables().length === 0) {
                  <p class="no-variables">Переменные не обнаружены</p>
                }
              </div>
            </div>

            <mat-slide-toggle formControlName="isActive" class="full-width">
              Активен
            </mat-slide-toggle>
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
    .template-form-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .variables-section {
      margin: 16px 0;
    }

    .variables-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .no-variables {
      color: #666;
      font-style: italic;
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
