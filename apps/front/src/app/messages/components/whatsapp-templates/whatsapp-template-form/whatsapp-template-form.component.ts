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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { MessageBackButtonComponent } from '../../shared/message-back-button/message-back-button.component';
import { VariableSelectorComponent } from '../../variable-selector/variable-selector.component';
import { WhatsAppTemplateService } from '../../../services/whatsapp-template.service';
import { MediaService } from '../../../services/media.service';
import { CreateWhatsAppTemplateDto } from '../../../models/message.models';

@Component({
  selector: 'app-whatsapp-template-form',
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
    MatProgressBarModule,
    PageLayoutComponent,
    MessageBackButtonComponent,
    VariableSelectorComponent
  ],
  templateUrl: './whatsapp-template-form.component.html',
  styleUrl: './whatsapp-template-form.component.scss'
})
export class WhatsAppTemplateFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly whatsappService = inject(WhatsAppTemplateService);
  private readonly mediaService = inject(MediaService);
  private readonly snackBar = inject(MatSnackBar);

  form!: FormGroup;
  templateId = signal<string | null>(null);
  loading = signal(false);
  uploadedMediaUrl = signal<string | null>(null);
  uploadedFileName = signal<string | null>(null);
  existingVariables = signal<string[]>([]); // Храним существующие переменные из загруженного шаблона
  currentContent = signal<string>(''); // Сигнал для отслеживания текущего контента
  
  // Прогресс загрузки из mediaService
  uploadProgress = computed(() => this.mediaService.uploadProgress());
  isUploading = computed(() => this.mediaService.uploading());
  
  // Автоматически обнаруживаем переменные из текущего контента
  detectedVariables = computed(() => {
    const content = this.currentContent();
    return this.extractVariables(content);
  });
  
  // Проверка, является ли загруженный файл изображением
  isUploadedImage = computed(() => {
    const url = this.uploadedMediaUrl();
    return url ? /\.(jpg|jpeg|png|gif|webp)$/i.test(url) : false;
  });

  categories = [
    { value: 'MARKETING', label: 'Маркетинг' },
    { value: 'TRANSACTIONAL', label: 'Транзакционное' },
    { value: 'NOTIFICATION', label: 'Уведомление' },
    { value: 'REMINDER', label: 'Напоминание' },
    { value: 'PROMOTIONAL', label: 'Промо' }
  ];

  ngOnInit() {
    this.initForm();
    
    // Устанавливаем начальное значение
    this.currentContent.set(this.form.get('content')?.value || '');
    
    // Подписываемся на изменения контента для обновления сигнала
    this.form.get('content')?.valueChanges.subscribe((value) => {
      this.currentContent.set(value || '');
    });
    
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id);
    
    if (id && id !== 'new') {
      this.loadTemplate(id);
    }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      content: ['', Validators.required],
      category: ['MARKETING'],
      mediaUrl: [''],
      buttonText: [''],
      isActive: [true]
    });
  }

  loadTemplate(id: string) {
    this.loading.set(true);
    this.whatsappService.getById(id).subscribe({
      next: (template) => {
        this.form.patchValue({
          name: template.name,
          content: template.content,
          category: template.category,
          mediaUrl: template.mediaUrl || '',
          buttonText: template.buttonText || '',
          isActive: template.isActive
        });
        
        // Обновляем сигнал контента
        this.currentContent.set(template.content);
        
        // Сохраняем существующие переменные из шаблона
        if (template.variables && template.variables.length > 0) {
          this.existingVariables.set(template.variables);
        }
        
        // Устанавливаем загруженный медиафайл для отображения превью
        if (template.mediaUrl) {
          this.uploadedMediaUrl.set(template.mediaUrl);
          // Извлекаем имя файла из URL
          const fileName = template.mediaUrl.split('/').pop() || 'media';
          this.uploadedFileName.set(fileName);
        }
        
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблона', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/messages/whatsapp-templates']);
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
    
    // Извлечь переменные из контента
    const extractedVariables = this.extractVariables(formValue.content);
    
    // Объединяем существующие переменные с извлеченными из контента
    // Это гарантирует, что не потеряем переменные, которые могли быть в исходном шаблоне
    const allVariables = [...new Set([...this.existingVariables(), ...extractedVariables])];
    
    const dto: CreateWhatsAppTemplateDto = {
      name: formValue.name,
      content: formValue.content,
      category: formValue.category,
      variables: allVariables,
      isActive: formValue.isActive,
      mediaUrl: formValue.mediaUrl || undefined,
      buttonText: formValue.buttonText || undefined
    };

    const operation = this.templateId()
      ? this.whatsappService.update(this.templateId()!, dto)
      : this.whatsappService.create(dto);

    operation.subscribe({
      next: () => {
        this.snackBar.open(
          this.templateId() ? 'Шаблон обновлён' : 'Шаблон создан',
          'Закрыть',
          { duration: 3000 }
        );
        this.router.navigate(['/messages/whatsapp-templates']);
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
    this.router.navigate(['/messages/whatsapp-templates']);
  }

  /**
   * Обработка выбора файла
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Валидация размера (16MB для WhatsApp)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      this.snackBar.open('Файл слишком большой. Максимальный размер: 16MB', 'Закрыть', { duration: 5000 });
      return;
    }

    // Валидация типа файла
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/3gpp',
      'video/quicktime',
      'audio/aac',
      'audio/mp4',
      'audio/mpeg',
      'audio/amr',
      'audio/ogg',
      'audio/wav',
      'audio/x-m4a',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open(
        `Неподдерживаемый тип файла: ${file.type}. Разрешены: изображения (JPEG, PNG, GIF, WebP), видео (MP4), аудио (MP3, OGG, AAC), документы (PDF, DOC, DOCX)`,
        'Закрыть',
        { duration: 5000 }
      );
      return;
    }

    // Загружаем файл
    this.mediaService.uploadFile(file).subscribe({
      next: (progress) => {
        if (progress.file) {
          // Файл успешно загружен
          this.uploadedMediaUrl.set(progress.file.url);
          this.uploadedFileName.set(progress.file.originalName);
          this.form.patchValue({ mediaUrl: progress.file.url });
          this.snackBar.open('Файл успешно загружен', 'Закрыть', { duration: 3000 });
        }
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка загрузки файла',
          'Закрыть',
          { duration: 5000 }
        );
      }
    });
  }

  /**
   * Удалить загруженный файл
   */
  removeMedia(): void {
    this.uploadedMediaUrl.set(null);
    this.uploadedFileName.set(null);
    this.form.patchValue({ mediaUrl: '' });
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

  /**
   * Вставить переменную в позицию курсора в textarea
   */
  insertVariable(variableSyntax: string, textarea: HTMLTextAreaElement): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = this.form.get('content')?.value || '';
    
    // Вставляем переменную в позицию курсора
    const newText = currentValue.substring(0, start) + variableSyntax + currentValue.substring(end);
    this.form.patchValue({ content: newText });
    
    // Устанавливаем курсор после вставленной переменной
    setTimeout(() => {
      const newCursorPos = start + variableSyntax.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });
  }
}
