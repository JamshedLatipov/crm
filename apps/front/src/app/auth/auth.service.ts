import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface StoredAuthData {
  username: string;
  token: string;
  ts: number;      // stored timestamp
  exp?: number;    // unix seconds expiration
  roles?: string[];
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

  private apiBase = environment.apiBase;
  private http = inject(HttpClient);

  constructor() {
    this.restoreSession();
  }

  user = this._user.asReadonly();

  getToken(): string | null {
    const data = this.getStoredAuth();
    if (!data) return null;
    if (data.exp && Date.now() / 1000 > data.exp) {
      this.clearStoredAuth();
      return null;
    }
    return data.token;
  }

  isAuthenticated(): boolean {
    const data = this.getStoredAuth();
    if (!data) return false;
    if (data.exp && Date.now() / 1000 > data.exp) {
      this.clearStoredAuth();
      return false;
    }
    return !!this._user();
  }

  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const decoded = this.decodeJwt(token);
    return decoded?.sub?.toString() || null;
  }

  getUserData(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    return this.decodeJwt(token) || null;
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
  const store: StoredAuthData = { username, token, ts: Date.now(), exp: decoded?.exp, roles: decoded?.roles };
      // Persist session: if the user requested "remember" keep token in
      // localStorage (longer lived), otherwise keep it in sessionStorage.
      if (remember) {
        localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(store));
      } else {
        sessionStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(store));
      }
  // Prefer operator creds from JWT payload, fallback to explicit sip field
  // NOTE: do NOT persist operator password in localStorage (security risk).
  // Keep only the username client-side if needed; passwords must not be stored
  // in persistent browser storage. For secure softphone provisioning use
  // ephemeral credentials issued by the backend instead.
  const op = decoded?.operator || res.sip;
  // Do not persist operator username/password in browser storage.
  // Operator credentials must be transient and delivered via JWT or
  // ephemeral provisioning from the server.
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    try {
      // Call logout API to log the activity on server
      await firstValueFrom(
        this.http.post(`${this.apiBase}/auth/logout`, {})
      );
    } catch (error) {
      // Ignore API errors during logout
      console.warn('Logout API call failed:', error);
    }

    // Clear local session data
    this._user.set(null);
    this.clearStoredAuth();
  // operator credentials are not persisted client-side anymore
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

  private restoreSession() {
  // Prefer localStorage (remembered session) then sessionStorage
  const raw = localStorage.getItem(AuthService.STORAGE_KEY) || sessionStorage.getItem(AuthService.STORAGE_KEY);
    if (!raw) return;
    try {
      const data: StoredAuthData = JSON.parse(raw);
      if (!data.token || !data.username) return;
      const decoded = this.decodeJwt(data.token);
      if (decoded?.exp && Date.now() / 1000 > decoded.exp) {
        this.clearStoredAuth();
        return;
      }
      this._user.set(data.username);
    } catch { /* ignore */ }
  }

  private getStoredAuth(): StoredAuthData | null {
  const raw = localStorage.getItem(AuthService.STORAGE_KEY) || sessionStorage.getItem(AuthService.STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as StoredAuthData; } catch { return null; }
  }

  private clearStoredAuth() {
  localStorage.removeItem(AuthService.STORAGE_KEY);
  sessionStorage.removeItem(AuthService.STORAGE_KEY);
  }
}
