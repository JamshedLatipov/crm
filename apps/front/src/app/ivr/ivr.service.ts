import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IvrNodeDto {
  id?: string;
  name: string;
  parentId?: string | null;
  digit?: string | null;
  action: string;
  payload?: string | null;
  order?: number;
  timeoutMs?: number;
  webhookUrl?: string | null;
  webhookMethod?: string | null;
  backDigit?: string | null;
  allowEarlyDtmf?: boolean;
  repeatDigit?: string | null;
  rootDigit?: string | null;
  queueName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class IvrApiService {
  private http = inject(HttpClient);
  private base = environment.apiBase + '/ivr/nodes';

  roots(): Observable<IvrNodeDto[]> {
    return this.http.get<IvrNodeDto[]>(`${this.base}/root`);
  }
  children(id: string): Observable<IvrNodeDto[]> {
    return this.http.get<IvrNodeDto[]>(`${this.base}/${id}/children`);
  }
  node(id: string): Observable<IvrNodeDto> {
    return this.http.get<IvrNodeDto>(`${this.base}/${id}`);
  }
  create(dto: IvrNodeDto): Observable<IvrNodeDto> {
    return this.http.post<IvrNodeDto>(this.base, dto);
  }
  update(id: string, dto: Partial<IvrNodeDto>): Observable<IvrNodeDto> {
    return this.http.put<IvrNodeDto>(`${this.base}/${id}`, dto);
  }
  remove(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  // Media endpoints
  mediaList() {
    return this.http.get<{ id: string; name: string; filename: string }[]>(
      environment.apiBase + '/ivr/media'
    );
  }
  uploadMedia(form: FormData) {
    return this.http.post(environment.apiBase + '/ivr/media/upload', form);
  }
  deleteMedia(id: string) {
    return this.http.delete(environment.apiBase + `/ivr/media/${id}`);
  }
}
