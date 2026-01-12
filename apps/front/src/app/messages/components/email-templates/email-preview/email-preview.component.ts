import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { MessageBackButtonComponent } from '../../shared/message-back-button/message-back-button.component';
import { EmailTemplateService } from '../../../services/email-template.service';
import { EmailTemplate } from '../../../models/message.models';

@Component({
  selector: 'app-email-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    PageLayoutComponent,
    MessageBackButtonComponent
  ],
  templateUrl: './email-preview.component.html',
  styleUrl: './email-preview.component.scss'
})
export class EmailPreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly emailService = inject(EmailTemplateService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly snackBar = inject(MatSnackBar);

  templateId = signal<string>('');
  template = signal<EmailTemplate | null>(null);
  loading = signal(false);
  variableValues = signal<Record<string, string>>({});
  renderedSubject = signal('');
  renderedHtml = signal<SafeHtml>('');
  renderedText = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.snackBar.open('ID шаблона не указан', 'Закрыть', { duration: 3000 });
      this.router.navigate(['/messages/email-templates']);
      return;
    }
    
    this.templateId.set(id);
    this.loadTemplate(id);
  }

  loadTemplate(id: string) {
    this.loading.set(true);
    this.emailService.getById(id).subscribe({
      next: (template) => {
        this.template.set(template);
        
        // Инициализировать значения переменных пустыми строками
        const initialValues: Record<string, string> = {};
        if (template.variables) {
          Object.keys(template.variables).forEach(key => {
            initialValues[key] = '';
          });
        }
        this.variableValues.set(initialValues);
        
        this.loading.set(false);
        this.updatePreview();
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблона', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
        this.router.navigate(['/messages/email-templates']);
      }
    });
  }

  updatePreview() {
    const tmpl = this.template();
    if (!tmpl) return;
    
    const values = this.variableValues();
    
    // Рендер темы
    let subject = tmpl.subject;
    for (const [key, value] of Object.entries(values)) {
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    this.renderedSubject.set(subject);

    // Рендер HTML
    let html = tmpl.htmlContent;
    for (const [key, value] of Object.entries(values)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));

    // Рендер текста
    let text = tmpl.textContent || '';
    for (const [key, value] of Object.entries(values)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    this.renderedText.set(text);
  }

  goBack() {
    this.router.navigate(['/messages/email-templates']);
  }

  getVariableKeys(): string[] {
    const tmpl = this.template();
    if (!tmpl || !tmpl.variables) return [];
    return Object.keys(tmpl.variables);
  }
}
