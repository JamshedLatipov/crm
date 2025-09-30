import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

interface ApiResult {
  status: number | string;
  statusText: string;
  body: unknown;
}

@Component({
  selector: 'app-auth-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>Тест JWT аутентификации</h1>
      
      <div style="margin: 20px 0;">
        <h2>Статус аутентификации</h2>
        <p><strong>Пользователь:</strong> {{ user() || 'Не авторизован' }}</p>
        <p><strong>Есть токен:</strong> {{ hasToken() ? 'Да' : 'Нет' }}</p>
        <p><strong>Авторизован:</strong> {{ isAuthenticated() ? 'Да' : 'Нет' }}</p>
      </div>

      <div style="margin: 20px 0;">
        <h2>Тест API запросов</h2>
        <button (click)="testDealsApi()" [disabled]="loading()">
          {{ loading() ? 'Загрузка...' : 'Тест /api/deals' }}
        </button>
        
        <div *ngIf="apiResult()" style="margin-top: 10px;">
          <h3>Результат:</h3>
          <div [style.color]="apiSuccess() ? 'green' : 'red'">
            <strong>Статус:</strong> {{ apiResult()?.status }} {{ apiResult()?.statusText }}
          </div>
          <div style="margin-top: 10px;">
            <strong>Ответ:</strong>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ apiResult()?.body | json }}</pre>
          </div>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h2>Тест создания сделки</h2>
        <button (click)="testCreateDeal()" [disabled]="loading()">
          {{ loading() ? 'Загрузка...' : 'Создать тестовую сделку' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
    button:hover:not(:disabled) {
      background: #0056b3;
    }
  `]
})
export class AuthTestComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  
  user = signal<string | null>(null);
  hasToken = signal<boolean>(false);
  isAuthenticated = signal<boolean>(false);
  loading = signal<boolean>(false);
  apiResult = signal<ApiResult | null>(null);
  apiSuccess = signal<boolean>(false);

  ngOnInit() {
    this.updateAuthStatus();
  }

  updateAuthStatus() {
    this.user.set(this.auth.user());
    this.hasToken.set(!!this.auth.getToken());
    this.isAuthenticated.set(this.auth.isAuthenticated());
  }

  async testDealsApi() {
    this.loading.set(true);
    this.apiResult.set(null);
    
    try {
      const response = await this.http.get(`${environment.apiBase}/deals`).toPromise();
      this.apiResult.set({
        status: 200,
        statusText: 'OK',
        body: response
      });
      this.apiSuccess.set(true);
    } catch (error: unknown) {
      const httpError = error as { status?: number; statusText?: string; error?: unknown; message?: string };
      this.apiResult.set({
        status: httpError.status || 'unknown',
        statusText: httpError.statusText || httpError.message || 'Unknown error',
        body: httpError.error || httpError
      });
      this.apiSuccess.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  async testCreateDeal() {
    this.loading.set(true);
    this.apiResult.set(null);
    
    const testDeal = {
      title: `Тестовая сделка ${new Date().toLocaleString()}`,
      description: 'Создана через тест компонент',
      amount: 75000,
      probability: 60
    };
    
    try {
      const response = await this.http.post(`${environment.apiBase}/deals`, testDeal).toPromise();
      this.apiResult.set({
        status: 201,
        statusText: 'Created',
        body: response
      });
      this.apiSuccess.set(true);
    } catch (error: unknown) {
      const httpError = error as { status?: number; statusText?: string; error?: unknown; message?: string };
      this.apiResult.set({
        status: httpError.status || 'unknown',
        statusText: httpError.statusText || httpError.message || 'Unknown error',
        body: httpError.error || httpError
      });
      this.apiSuccess.set(false);
    } finally {
      this.loading.set(false);
    }
  }
}