import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="relative flex size-full min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[var(--background-secondary)]">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-secondary)]">
          <svg class="h-8 w-8 text-[var(--brand-primary)]" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path class="bank-logo-path" d="M24 4L4 14V22C4 33.05 12.95 42.55 24 45C35.05 42.55 44 33.05 44 22V14L24 4ZM24 24.5H38C36.65 33.45 30.85 39.85 24 41.5V24.5H10V16.3L24 10.5V24.5Z" fill="currentColor"></path>
          </svg>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">SecureCall Login</h1>
        <p class="mt-2 text-[var(--text-secondary)]">Access your contact center softphone.</p>
      </div>
      <div class="rounded-xl border border-[var(--border-color)] bg-[var(--background-primary)] p-6 shadow-sm sm:p-8">
        <form class="space-y-6" (ngSubmit)="submit()">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)]" for="username">Agent ID</label>
            <div class="mt-1">
              <input class="form-input block w-full rounded-lg border-[var(--border-color)] bg-[var(--background-secondary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] shadow-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" id="username" name="username" placeholder="Enter your Agent ID" required type="text" [(ngModel)]="username" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)]" for="password">Password</label>
            <div class="mt-1">
              <input class="form-input block w-full rounded-lg border-[var(--border-color)] bg-[var(--background-secondary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] shadow-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" id="password" name="password" placeholder="Enter your password" required type="password" [(ngModel)]="password" />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input class="h-4 w-4 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" id="remember-me" name="rememberMe" type="checkbox" [(ngModel)]="rememberMe" />
              <label class="ml-2 block text-sm text-[var(--text-secondary)]" for="remember-me">Remember me</label>
            </div>
            <div class="text-sm">
              <a class="font-medium text-[var(--brand-primary)] hover:text-blue-700" href="#">Forgot your password?</a>
            </div>
          </div>
          <div *ngIf="error()" class="text-sm text-red-600" role="alert">{{ error() }}</div>
          <div>
            <button class="flex w-full justify-center rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] disabled:opacity-60" type="submit" [disabled]="disabled()">
              <span *ngIf="!loggingIn(); else loading">Sign In</span>
              <ng-template #loading>Signing In...</ng-template>
            </button>
          </div>
        </form>
      </div>
      <p class="mt-10 text-center text-sm text-[var(--text-secondary)]">
        Need help? <a class="font-semibold leading-6 text-[var(--brand-primary)] hover:text-blue-700" href="#">Contact IT Support</a>
      </p>
    </div>
  </div>
  `,
  styles: [`
    :host { display: contents; }
    :root, :host { /* Scoped CSS variables for this page */
      --brand-primary: #0a4d8c; --brand-secondary: #f0f6fc;
      --text-primary: #1e293b; --text-secondary: #64748b;
      --background-primary: #ffffff; --background-secondary: #f8fafc;
      --border-color: #e2e8f0;
    }
    .bank-logo-path { fill: var(--brand-primary); }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  rememberMe = false;
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  error = signal<string | null>(null);
  loggingIn = signal(false);
  disabled = computed(() => this.loggingIn());

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/softphone');
    }
  }

  async submit() {
    this.error.set(null);
    if (!this.username || !this.password) {
      this.error.set('Введите логин и пароль');
      return;
    }
    this.loggingIn.set(true);
    const ok = await this.auth.login(this.username.trim(), this.password, this.rememberMe);
    this.loggingIn.set(false);
    if (ok) {
      this.router.navigateByUrl('/softphone');
    } else {
      this.error.set('Неверные учетные данные');
    }
  }
}
