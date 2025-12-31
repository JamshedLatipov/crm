import { Component, OnInit, signal, inject } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { SmsTemplateService } from '../../../services/sms-template.service';
import { SmsTemplate, CreateSmsTemplateDto } from '../../../models/notification.models';

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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    PageLayoutComponent
  ],
  templateUrl: './sms-template-form.component.html',
  styleUrl: './sms-template-form.component.scss'
})
export class SmsTemplateFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  form!: FormGroup;
  templateId = signal<string | null>(null);
  charCount = signal(0);
  detectedVariables = signal<string[]>([]);
  loading = signal(false);

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id);
    
    if (id && id !== 'new') {
      this.loadTemplate(id);
    }
  }

  loadTemplate(id: string) {
    this.loading.set(true);
    this.smsTemplateService.getById(id).subscribe({
      next: (template) => {
        this.form.patchValue({
          name: template.name,
          content: template.content,
          isActive: template.isActive
        });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблона', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/notifications/sms-templates']);
      }
    });
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
    if (this.form.invalid || this.loading()) {
      return;
    }

    const dto: CreateSmsTemplateDto = {
      name: this.form.value.name!,
      content: this.form.value.content!,
      variables: this.detectedVariables(),
      isActive: this.form.value.isActive ?? true
    };

    this.loading.set(true);

    const operation = this.templateId()
      ? this.smsTemplateService.update(this.templateId()!, dto)
      : this.smsTemplateService.create(dto);

    operation.subscribe({
      next: () => {
        this.snackBar.open(
          this.templateId() ? 'Шаблон обновлен' : 'Шаблон создан',
          'Закрыть',
          { duration: 3000 }
        );
        this.router.navigate(['/notifications/sms-templates']);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка сохранения шаблона',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/notifications/sms-templates']);
  }
}
