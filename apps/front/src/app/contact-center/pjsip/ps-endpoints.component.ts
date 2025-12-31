import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { shareReplay } from 'rxjs';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PsEndpointsService, PsEndpointRecord } from './ps-endpoints.service';
import { PsEndpointFormComponent } from './ps-endpoint-form.component';
import { MatMenuModule } from '@angular/material/menu';


@Component({
  standalone: true,
  selector: 'app-pjsip-endpoints',
  imports: [
    CommonModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
  ],
  template: `
    <app-page-layout title="PJSIP Endpoints">
      <div page-actions class="actions">
        <button mat-flat-button color="primary" (click)="add()">Создать endpoint</button>
      </div>
      <crm-table [data]="endpoints$ | async" [columns]="columns">
        <ng-template crmColumnTemplate="actionsTemplate" let-row>
          <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="edit(row)"><mat-icon>edit</mat-icon>Редактировать</button>
            <button mat-menu-item (click)="removeRow(row)"><mat-icon>delete</mat-icon>Удалить</button>
          </mat-menu>
        </ng-template>
      </crm-table>
    </app-page-layout>
  `,
  styles: [`.actions{margin-bottom:12px}`],
})
export class PsEndpointsComponent {
  private svc = inject(PsEndpointsService);
  dialog = inject(MatDialog);

  endpoints$ = this.svc.list().pipe(shareReplay({ bufferSize: 1, refCount: true }));

  columns: CrmColumn[] = [
    { key: 'id', label: 'ID', width: '12%' },
    { key: 'transport', label: 'Transport', width: '8%' },
    { key: 'auth', label: 'Auth', width: '10%' },
    { key: 'aors', label: 'AORs', width: '10%' },
    { key: 'context', label: 'Context', width: '8%' },
    { key: 'webrtc', label: 'WebRTC', width: '6%' },
    { key: 'ice_support', label: 'ICE', width: '6%' },
    { key: 'allow', label: 'Allow', width: '8%' },
    { key: 'disallow', label: 'Disallow', width: '8%' },
    { key: 'media_encryption', label: 'Media enc', width: '6%' },
    { key: 'actions', label: 'Действия', width: '8%', template: 'actionsTemplate' },
  ];

  async add() {
    const dialog = this.dialog.open(PsEndpointFormComponent, { data: { mode: 'create' } });
    const res: any = await dialog.afterClosed().toPromise();
    if (res?.confirmed && res.value) {
      await this.svc.create(res.value).toPromise();
      this.reload();
    }
  }

  async edit(row: PsEndpointRecord) {
    const dialog = this.dialog.open(PsEndpointFormComponent, { data: { mode: 'edit', payload: row } });
    const res: any = await dialog.afterClosed().toPromise();
    if (res?.confirmed && res.value) {
      await this.svc.update(row.id, res.value).toPromise();
      this.reload();
    }
  }

  async removeRow(row: PsEndpointRecord) {
    if (!confirm(`Удалить endpoint "${row.id}"?`)) return;
    await this.svc.remove(row.id).toPromise();
    this.reload();
  }

  reload() {
    this.endpoints$ = this.svc.list().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }
}
