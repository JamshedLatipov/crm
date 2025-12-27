import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
    MatTabsModule
  ],
  template: `
    <div class="preview-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Предпросмотр Email шаблона</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="variables-section">
            <h3>Заполните переменные:</h3>
            @for (variable of template().variables; track variable) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ variable }}</mat-label>
                <input 
                  matInput 
                  [(ngModel)]="variableValues()[variable]"
                  (ngModelChange)="updatePreview()">
              </mat-form-field>
            }
          </div>

          <mat-tab-group>
            <mat-tab label="Предпросмотр">
              <div class="tab-content">
                <div class="email-preview">
                  <div class="email-header">
                    <strong>Тема:</strong> {{ renderedSubject() }}
                  </div>
                  <div class="email-body" [innerHTML]="renderedHtml()"></div>
                </div>
              </div>
            </mat-tab>

            <mat-tab label="HTML код">
              <div class="tab-content">
                <pre class="code-block">{{ template().htmlBody }}</pre>
              </div>
            </mat-tab>

            <mat-tab label="Текстовая версия">
              <div class="tab-content">
                <pre class="code-block">{{ renderedText() }}</pre>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .preview-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .variables-section {
      margin-bottom: 24px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .email-preview {
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }

    .email-header {
      background: #f5f5f5;
      padding: 16px;
      border-bottom: 1px solid #ddd;
    }

    .email-body {
      padding: 24px;
      background: white;
      min-height: 300px;
    }

    .code-block {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 12px;
    }
  `]
})
export class EmailPreviewComponent implements OnInit {
  templateId = signal<string>('');
  template = signal({
    id: '1',
    name: 'Пример',
    subject: 'Здравствуйте, {{name}}!',
    htmlBody: '<h1>Привет, {{name}}!</h1><p>Ваш email: {{email}}</p>',
    textBody: 'Привет, {{name}}!\nВаш email: {{email}}',
    variables: ['name', 'email']
  });
  variableValues = signal<Record<string, string>>({});
  renderedSubject = signal('');
  renderedHtml = signal<SafeHtml>('');
  renderedText = signal('');

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id || '');
    // TODO: Загрузить шаблон через сервис
    this.updatePreview();
  }

  updatePreview() {
    const values = this.variableValues();
    
    // Рендер темы
    let subject = this.template().subject;
    for (const [key, value] of Object.entries(values)) {
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    this.renderedSubject.set(subject);

    // Рендер HTML
    let html = this.template().htmlBody;
    for (const [key, value] of Object.entries(values)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));

    // Рендер текста
    let text = this.template().textBody;
    for (const [key, value] of Object.entries(values)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    this.renderedText.set(text);
  }
}
