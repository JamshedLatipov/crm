import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface StoredAuthData {
  username: string;
  token: string;
  ts: number;
}
interface LoginResponse {
  access_token: string;
  sip?: { username?: string; password?: string };
}

interface JwtPayload {
  username: string;
  sub: number;
  roles: string[];
  operator?: { username?: string; password?: string };
  exp?: number;
  iat?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static STORAGE_KEY = 'crm_auth';
  private _user = signal<string | null>(null);

  private apiBase =
    (globalThis as unknown as { __API_BASE__?: string }).__API_BASE__ ||
    'http://localhost:3000/api';
  private http = inject(HttpClient);

  constructor() {
    const raw = localStorage.getItem(AuthService.STORAGE_KEY);
    if (raw) {
      try {
        const data: StoredAuthData = JSON.parse(raw);
        if (data?.token && data?.username) {
          this._user.set(data.username);
        }
      } catch {
        /* ignore */
      }
    }
  }

  user = this._user.asReadonly();

  isAuthenticated(): boolean {
    return !!this._user();
  }

  async login(
    username: string,
    password: string,
    remember: boolean
  ): Promise<boolean> {
    if (!username || !password) return false;
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiBase}/auth/login`, {
          username,
          password,
        })
      );
      const token = res.access_token;
      if (!token) return false;
      // Decode JWT (without verifying signature client-side) to extract operator creds
      const decoded = this.decodeJwt(token);
      const effectiveUsername = decoded?.username || username;
      this._user.set(effectiveUsername);
      const store: StoredAuthData = { username, token, ts: Date.now() };
      if (remember) {
        localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(store));
      } else {
        sessionStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(store));
      }
      // Prefer operator creds from JWT payload, fallback to explicit sip field
      const op = decoded?.operator || res.sip;
      if (op?.username) localStorage.setItem('operator.username', op.username);
      if (op?.password) localStorage.setItem('operator.password', op.password);
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    this._user.set(null);
    localStorage.removeItem(AuthService.STORAGE_KEY);
    sessionStorage.removeItem(AuthService.STORAGE_KEY);
    localStorage.removeItem('operator.username');
    localStorage.removeItem('operator.password');
  }

  private decodeJwt(token: string): JwtPayload | undefined {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return undefined;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }
}
