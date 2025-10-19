import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type ActivityItem = {
  id: string;
  source: 'lead' | 'deal' | 'contact' | 'other';
  title: string;
  description?: string;
  userName?: string | null;
  createdAt: string; // ISO
  icon?: string;
  meta?: Record<string, unknown>;
};

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  getRecentActivity(limit = 10): Observable<ActivityItem[]> {
    // Call leads recent history and deals recent changes in parallel, and recent contacts
    const leads$ = this.http.get<any>(`${environment.apiBase}/leads/history/recent?limit=${limit}`).pipe(
      map((r) => (r?.history || []).map((h: any) => ({
        id: `lead-${h.id}`,
        source: 'lead' as const,
        title: h.description || `Лид: ${h.lead?.name || h.leadId}`,
        description: h.description,
        userName: h.userName,
        createdAt: h.createdAt,
        icon: 'trending_up',
        meta: { changeType: h.changeType, lead: h.lead }
      })))
    );

    const deals$ = this.http.get<any>(`${environment.apiBase}/deals/history/recent?limit=${limit}`).pipe(
      map((r) => (r?.history || []).map((h: any) => ({
        id: `deal-${h.id}`,
        source: 'deal' as const,
        title: h.description || `Сделка: ${h.deal?.title || h.dealId}`,
        description: h.description,
        userName: h.userName,
        createdAt: h.createdAt,
        icon: 'handshake',
        meta: { changeType: h.changeType, deal: h.deal }
      })))
    );

    const contacts$ = this.http.get<any>(`${environment.apiBase}/contacts/recent?limit=${limit}`).pipe(
      map((r) => (r || []).map((c: any) => ({
        id: `contact-${c.id}`,
        source: 'contact' as const,
        title: `Контакт: ${c.name}`,
        description: c.position || c.companyName || '',
        userName: null,
        createdAt: c.createdAt || new Date().toISOString(),
        icon: 'people',
        meta: { contact: c }
      })))
    );

    return forkJoin([leads$, deals$, contacts$]).pipe(
      map(([leads, deals, contacts]) => {
        const merged = [...leads, ...deals, ...contacts];
        // sort by createdAt desc
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return merged.slice(0, limit);
      })
    );
  }

  getTopUsers(limit = 5): Observable<Array<{ userId: string; userName: string; changesCount: number; lastActivity: string }>> {
    const leads$ = this.http.get<any>(`${environment.apiBase}/leads/history/user-activity?limit=${limit}`);
    const deals$ = this.http.get<any>(`${environment.apiBase}/deals/history/user-activity?limit=${limit}`);

    return forkJoin([leads$, deals$]).pipe(
      map(([l, d]) => {
        const mapByUser = new Map<string, { userId: string; userName: string; changesCount: number; lastActivity: string }>();

        const push = (item: any) => {
          const uid = String(item.userId ?? item.user_id ?? item.user);
          const name = item.userName ?? item.user_name ?? item.userName ?? String(item.userName || item.user_id || uid);
          const count = Number(item.changesCount ?? item.changes_count ?? 0);
          const last = item.lastActivity ?? item.last_activity ?? item.lastActivity ?? new Date().toISOString();

          const existing = mapByUser.get(uid);
          if (existing) {
            existing.changesCount += count;
            if (new Date(last) > new Date(existing.lastActivity)) existing.lastActivity = last;
          } else {
            mapByUser.set(uid, { userId: uid, userName: name, changesCount: count, lastActivity: last });
          }
        };

        (l || []).forEach(push);
        (d || []).forEach(push);

        const arr = Array.from(mapByUser.values());
        arr.sort((a, b) => b.changesCount - a.changesCount);
        return arr.slice(0, limit);
      })
    );
  }
}
