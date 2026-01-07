import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { VariableSelectorComponent } from '../../variable-selector/variable-selector.component';
import { EmailTemplateService } from '../../../services/email-template.service';
import { CreateEmailTemplateDto, EmailTemplateCategory } from '../../../models/message.models';

@Component({
  selector: 'app-email-template-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    PageLayoutComponent,
    VariableSelectorComponent
  ],
  templateUrl: './email-template-form.component.html',
  styleUrl: './email-template-form.component.scss'
})
export class EmailTemplateFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly emailService = inject(EmailTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  form!: FormGroup;
  templateId = signal<string | null>(null);
  loading = signal(false);
  existingVariables = signal<string[]>([]); // Храним существующие переменные из загруженного шаблона
  currentContent = signal<string>(''); // Сигнал для отслеживания всего контента (subject + html + text)
  
  // Автоматически обнаруживаем переменные из текущего контента
  detectedVariables = computed(() => {
    const content = this.currentContent();
    return this.extractVariables(content);
  });

  categories = [
    { value: EmailTemplateCategory.MARKETING, label: 'Маркетинг' },
    { value: EmailTemplateCategory.TRANSACTIONAL, label: 'Транзакционное' },
    { value: EmailTemplateCategory.NOTIFICATION, label: 'Уведомление' },
    { value: EmailTemplateCategory.NEWSLETTER, label: 'Новостная рассылка' },
    { value: EmailTemplateCategory.WELCOME, label: 'Приветствие' },
    { value: EmailTemplateCategory.PROMOTIONAL, label: 'Промо' },
    { value: EmailTemplateCategory.SYSTEM, label: 'Системное' },
    { value: EmailTemplateCategory.OTHER, label: 'Другое' }
  ];

  ngOnInit() {
    this.initForm();
    
    // Устанавливаем начальное значение
    this.updateContentSignal();
    
    // Подписываемся на изменения контента для обновления сигнала
    this.form.get('subject')?.valueChanges.subscribe(() => this.updateContentSignal());
    this.form.get('htmlContent')?.valueChanges.subscribe(() => this.updateContentSignal());
    this.form.get('textContent')?.valueChanges.subscribe(() => this.updateContentSignal());
    
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id);
    
    if (id && id !== 'new') {
      this.loadTemplate(id);
    }
  }

  updateContentSignal() {
    const subject = this.form.get('subject')?.value || '';
    const htmlContent = this.form.get('htmlContent')?.value || '';
    const textContent = this.form.get('textContent')?.value || '';
    this.currentContent.set(subject + ' ' + htmlContent + ' ' + textContent);
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      subject: ['', Validators.required],
      htmlContent: ['', Validators.required],
      textContent: [''],
      category: [EmailTemplateCategory.MARKETING],
      preheader: [''],
      cssStyles: [''],
      isActive: [true]
    });
  }

  loadTemplate(id: string) {
    this.loading.set(true);
    this.emailService.getById(id).subscribe({
      next: (template) => {
        this.form.patchValue({
          name: template.name,
          description: template.description || '',
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent || '',
          category: template.category,
          preheader: template.preheader || '',
          cssStyles: template.cssStyles || '',
          isActive: template.isActive
        });
        
        // Сохраняем существующие переменные из шаблона (преобразуем Record в массив ключей)
        if (template.variables && Object.keys(template.variables).length > 0) {
          this.existingVariables.set(Object.keys(template.variables));
        }
        
        // Обновляем сигнал контента
        this.updateContentSignal();
        
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблона', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/messages/email-templates']);
      }
    });
  }

  save() {
    if (this.form.invalid) {
      this.snackBar.open('Заполните все обязательные поля', 'Закрыть', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const formValue = this.form.value;
    
    // Извлечь переменные из всех полей
    const extractedVariables = this.extractVariables(
      formValue.subject + ' ' + 
      formValue.htmlContent + ' ' + 
      (formValue.textContent || '')
    );
    
    // Объединяем существующие переменные с извлеченными из контента
    // Это гарантирует, что не потеряем переменные, которые могли быть в исходном шаблоне
    const allVariables = [...new Set([...this.existingVariables(), ...extractedVariables])];
    
    const dto: CreateEmailTemplateDto = {
      name: formValue.name,
      description: formValue.description || undefined,
      subject: formValue.subject,
      htmlContent: formValue.htmlContent,
      textContent: formValue.textContent || undefined,
      category: formValue.category,
      preheader: formValue.preheader || undefined,
      cssStyles: formValue.cssStyles || undefined,
      variables: allVariables.length > 0 ? this.variablesToObject(allVariables) : undefined
    };

    const operation = this.templateId()
      ? this.emailService.update(this.templateId()!, dto)
      : this.emailService.create(dto);

    operation.subscribe({
      next: () => {
        this.snackBar.open(
          this.templateId() ? 'Шаблон обновлён' : 'Шаблон создан',
          'Закрыть',
          { duration: 3000 }
        );
        this.router.navigate(['/messages/email-templates']);
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
    this.router.navigate(['/messages/email-templates']);
  }

  extractVariables(content: string): string[] {
    // Регулярное выражение для поиска переменных вида {{name}} или {{contact.name}}
    const regex = /\{\{([\w.]+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  variablesToObject(variables: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    variables.forEach(v => {
      obj[v] = ''; // Backend will provide descriptions
    });
    return obj;
  }

  /**
   * Вставить переменную в позицию курсора в textarea
   */
  insertVariable(variableSyntax: string, textarea: HTMLTextAreaElement): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const controlName = textarea.getAttribute('formControlName');
    
    if (!controlName) return;
    
    const currentValue = this.form.get(controlName)?.value || '';
    
    // Вставляем переменную в позицию курсора
    const newText = currentValue.substring(0, start) + variableSyntax + currentValue.substring(end);
    this.form.patchValue({ [controlName]: newText });
    
    // Устанавливаем курсор после вставленной переменной
    setTimeout(() => {
      const newCursorPos = start + variableSyntax.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });
  }
}
