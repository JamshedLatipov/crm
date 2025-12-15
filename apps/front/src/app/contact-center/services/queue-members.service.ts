import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface QueueMemberRecord {
  id: number;
  queue_name: string;
  member_name: string;
  penalty?: number;
  paused?: boolean;
  memberid?: string | null;
  member_interface?: string | null;
  iface?: string | null;
  uniqueid?: string | null;
  reason_paused?: string | null;
  member_type?: string | null;
}

@Injectable({ providedIn: 'root' })
export class QueueMembersService {
  private http = inject(HttpClient);
  private base = environment.apiBase + '/queue-members';

  list(queueName?: string): Observable<QueueMemberRecord[]> {
    const url = queueName ? `${this.base}?queue_name=${encodeURIComponent(queueName)}` : this.base;
    return this.http.get<QueueMemberRecord[]>(url);
  }

  create(payload: Partial<QueueMemberRecord>) {
    return this.http.post<QueueMemberRecord>(this.base, payload);
  }

  update(id: number, payload: Partial<QueueMemberRecord>) {
    return this.http.put<QueueMemberRecord>(`${this.base}/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
