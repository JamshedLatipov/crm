import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sms-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="preview-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Предпросмотр SMS шаблона</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="preview-section">
            <h3>Шаблон:</h3>
            <div class="template-box">
              {{ template().content }}
            </div>
          </div>

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

          <div class="preview-section">
            <h3>Результат:</h3>
            <div class="phone-preview">
              <div class="phone-screen">
                <div class="message-bubble">
                  {{ renderedContent() }}
                </div>
              </div>
            </div>
            <p class="char-count">
              Длина: {{ renderedContent().length }} символов
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .preview-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .preview-section {
      margin: 24px 0;
    }

    .template-box {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .phone-preview {
      display: flex;
      justify-content: center;
      margin: 24px 0;
    }

    .phone-screen {
      width: 320px;
      background: #1a1a1a;
      border-radius: 20px;
      padding: 40px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .message-bubble {
      background: #34b7f1;
      color: white;
      padding: 12px 16px;
      border-radius: 18px;
      border-top-left-radius: 4px;
      max-width: 250px;
      word-wrap: break-word;
    }

    .char-count {
      text-align: center;
      color: #666;
      margin-top: 8px;
    }

    .variables-section {
      margin: 24px 0;
    }
  `]
})
export class SmsPreviewComponent implements OnInit {
  templateId = signal<string>('');
  template = signal({
    id: '1',
    name: 'Пример',
    content: 'Здравствуйте, {{name}}! Ваш код: {{code}}',
    variables: ['name', 'code']
  });
  variableValues = signal<Record<string, string>>({});
  renderedContent = signal('');

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.templateId.set(id || '');
    // TODO: Загрузить шаблон через сервис
    this.updatePreview();
  }

  updatePreview() {
    let content = this.template().content;
    const values = this.variableValues();
    
    for (const [key, value] of Object.entries(values)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    }
    
    this.renderedContent.set(content);
  }
}
