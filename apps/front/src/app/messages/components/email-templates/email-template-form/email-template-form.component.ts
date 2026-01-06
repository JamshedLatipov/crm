import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-email-template-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatTabsModule
  ],
  template: `
    <div class="template-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            {{ templateId() ? 'Редактировать Email шаблон' : 'Новый Email шаблон' }}
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
              <mat-label>Тема письма</mat-label>
              <input matInput formControlName="subject" placeholder="Введите тему">
              @if (form.get('subject')?.hasError('required')) {
                <mat-error>Тема обязательна</mat-error>
              }
            </mat-form-field>

            <mat-tab-group>
              <mat-tab label="HTML">
                <div class="tab-content">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>HTML содержимое</mat-label>
                    <textarea 
                      matInput 
                      formControlName="htmlBody" 
                      rows="15" 
                      placeholder="Введите HTML код">
                    </textarea>
                  </mat-form-field>
                </div>
              </mat-tab>

              <mat-tab label="Текст">
                <div class="tab-content">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Текстовая версия</mat-label>
                    <textarea 
                      matInput 
                      formControlName="textBody" 
                      rows="15" 
                      placeholder="Введите текст (опционально)">
                    </textarea>
                    <mat-hint>Рекомендуется для почтовых клиентов без поддержки HTML</mat-hint>
                  </mat-form-field>
                </div>
              </mat-tab>
            </mat-tab-group>

            <mat-slide-toggle formControlName="isActive" class="full-width">
              Активен
            </mat-slide-toggle>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="cancel()">Отмена</button>
          <button mat-raised-button color="accent" (click)="preview()">
            Предпросмотр
          </button>
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
      max-width: 1000px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .tab-content {
      padding: 16px 0;
    }
  `]
})
export class EmailTemplateFormComponent implements OnInit {
  form!: FormGroup;
  templateId = signal<string | null>(null);

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
      subject: ['', Validators.required],
      htmlBody: ['', Validators.required],
      textBody: [''],
      isActive: [true]
    });
  }

  save() {
    if (this.form.valid) {
      // TODO: Сохранить через сервис
      console.log('Saving template:', this.form.value);
      this.router.navigate(['/notifications/email-templates']);
    }
  }

  preview() {
    const id = this.templateId() || 'new';
    this.router.navigate(['/notifications/email-templates', id, 'preview']);
  }

  cancel() {
    this.router.navigate(['/notifications/email-templates']);
  }
}
