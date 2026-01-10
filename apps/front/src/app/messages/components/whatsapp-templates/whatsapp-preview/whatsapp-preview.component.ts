import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { WhatsAppTemplateService } from '../../../services/whatsapp-template.service';
import { WhatsAppTemplate } from '../../../models/message.models';
import { Nl2brPipe } from '../../../../shared/pipes/nl2br.pipe';

@Component({
  selector: 'app-whatsapp-preview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatSnackBarModule,
    PageLayoutComponent,
    Nl2brPipe
  ],
  templateUrl: './whatsapp-preview.component.html',
  styleUrl: './whatsapp-preview.component.scss'
})
export class WhatsAppPreviewComponent implements OnInit {
  template = signal<WhatsAppTemplate | null>(null);
  loading = signal(true);
  variablesForm!: FormGroup;
  
  // Computed: рендерим контент с подставленными переменными
  renderedContent = computed(() => {
    const tpl = this.template();
    if (!tpl) return '';
    
    let content = tpl.content;
    const formValue = this.variablesForm?.value || {};
    
    // Подставляем значения переменных
    tpl.variables?.forEach((variable) => {
      const value = formValue[variable] || `{{${variable}}}`;
      content = content.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    });
    
    return content;
  });

  constructor(
    private route: ActivatedRoute,
    private whatsAppService: WhatsAppTemplateService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.snackBar.open('ID шаблона не указан', 'Закрыть', { duration: 3000 });
      this.loading.set(false);
      return;
    }

    this.loadTemplate(id);
  }

  private loadTemplate(id: string) {
    this.loading.set(true);
    this.whatsAppService.getById(id).subscribe({
      next: (template) => {
        this.template.set(template);
        this.initVariablesForm(template.variables || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка загрузки шаблона',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      }
    });
  }

  private initVariablesForm(variables: string[]) {
    const controls: { [key: string]: any } = {};
    
    variables.forEach((variable) => {
      // Устанавливаем примеры значений для общих переменных
      const defaultValue = this.getDefaultValue(variable);
      controls[variable] = [defaultValue, Validators.required];
    });

    this.variablesForm = this.fb.group(controls);
  }

  private getDefaultValue(variable: string): string {
    const examples: { [key: string]: string } = {
      'contact.firstName': 'Иван',
      'contact.lastName': 'Иванов',
      'contact.middleName': 'Иванович',
      'contact.name': 'Иван Иванов',
      'contact.phone': '+7 (999) 123-45-67',
      'contact.email': 'ivan@example.com',
      'company.name': 'ООО "Компания"',
      'agent.firstName': 'Мария',
      'agent.lastName': 'Петрова',
      'date': new Date().toLocaleDateString('ru-RU'),
      'time': new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    return examples[variable] || '';
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  isImage(url?: string): boolean {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  isVideo(url?: string): boolean {
    if (!url) return false;
    return /\.(mp4|mov)$/i.test(url);
  }

  sendTest() {
    if (!this.template()) {
      return;
    }

    if (this.variablesForm && this.variablesForm.invalid) {
      this.snackBar.open('Заполните все переменные', 'Закрыть', { duration: 3000 });
      return;
    }

    // TODO: Реализовать отправку тестового сообщения через API
    this.snackBar.open('Функция отправки тестового сообщения в разработке', 'Закрыть', { duration: 3000 });
  }
}

