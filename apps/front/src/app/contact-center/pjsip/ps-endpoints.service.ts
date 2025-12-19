import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface PsEndpointRecord {
  id: string;
  transport?: string | null;
  aors?: string | null;
  auth?: string | null;
  context?: string | null;
  disallow?: string | null;
  allow?: string | null;
  direct_media?: string | null;
  dtmf_mode?: string | null;
  ice_support?: string | null;
  mailboxes?: string | null;
  media_encryption?: string | null;
  rewrite_contact?: string | null;
  callerid?: string | null;
  webrtc?: string | null;
  dtls_verify?: string | null;
  dtls_setup?: string | null;
  force_rport?: string | null;
  rtp_symmetric?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PsEndpointsService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  list(): Observable<PsEndpointRecord[]> {
    return this.http.get<PsEndpointRecord[]>(`${this.base}/ps-endpoints`);
  }

  create(payload: Partial<PsEndpointRecord>) {
    return this.http.post<PsEndpointRecord>(`${this.base}/ps-endpoints`, payload);
  }

  update(id: string, payload: Partial<PsEndpointRecord>) {
    return this.http.put<PsEndpointRecord>(`${this.base}/ps-endpoints/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/ps-endpoints/${id}`);
  }

  free(): Observable<PsEndpointRecord[]> {
    return this.http.get<PsEndpointRecord[]>(`${this.base}/ps-endpoints/free`);
  }
}
