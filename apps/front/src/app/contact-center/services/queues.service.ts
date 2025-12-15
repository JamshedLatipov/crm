import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface QueueRecord {
  id: number;
  name: string;
  description?: string | null;
  context?: string | null;
  strategy?: string | null;
  musicclass?: string | null;
  maxlen?: number;
  timeout?: number;
  retry?: number;
  wrapuptime?: number;
  announce_frequency?: number;
  joinempty?: boolean;
  leavewhenempty?: boolean;
  ringinuse?: boolean;
}

@Injectable({ providedIn: 'root' })
export class QueuesService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  list(): Observable<QueueRecord[]> {
    return this.http.get<QueueRecord[]>(`${this.base}/queues`);
  }

  create(payload: Partial<QueueRecord>) {
    return this.http.post<QueueRecord>(`${this.base}/queues`, payload);
  }

  update(id: number, payload: Partial<QueueRecord>) {
    return this.http.put<QueueRecord>(`${this.base}/queues/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/queues/${id}`);
  }
}
