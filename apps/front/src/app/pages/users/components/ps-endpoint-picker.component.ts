import { Component, inject, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PsEndpointsService, PsEndpointRecord } from '../../../contact-center/pjsip/ps-endpoints.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-ps-endpoint-picker',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, MatListModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>Выбрать SIP-эндпоинт</h2>
      <button mat-icon-button (click)="close()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Поиск</mat-label>
        <input matInput [(ngModel)]="query" placeholder="Введите ID эндпоинта" />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Загрузка эндпоинтов...</p>
      </div>

      <div *ngIf="!loading" class="endpoints-list">
        <mat-list>
          <mat-list-item *ngFor="let p of filtered()" class="endpoint-item" (click)="select(p)">
            <div mat-line class="endpoint-id">
              <mat-icon class="endpoint-icon">phone</mat-icon>
              {{ p.id }}
            </div>
            <button mat-icon-button class="select-button" (click)="select(p); $event.stopPropagation()" aria-label="Выбрать">
              <mat-icon>check_circle</mat-icon>
            </button>
          </mat-list-item>
        </mat-list>

        <div *ngIf="filtered().length === 0" class="empty-state">
          <mat-icon>search_off</mat-icon>
          <p>Эндпоинты не найдены</p>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="close()" class="cancel-button">
        Отмена
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['./ps-endpoint-picker.component.scss']
})
export class PsEndpointPickerComponent implements OnInit {
  private psService = inject(PsEndpointsService);
  private dialogRef = inject(MatDialogRef<PsEndpointPickerComponent>);

  loading = true;
  endpoints: PsEndpointRecord[] = [];
  query = '';

  ngOnInit(): void {
    // Load free endpoints from backend
    this.psService.free().pipe(catchError(() => of([] as PsEndpointRecord[]))).subscribe((eps) => {
      this.endpoints = eps || [];
      this.loading = false;
    });
  }

  filtered(): PsEndpointRecord[] {
    if (!this.query) return this.endpoints;
    const q = this.query.toLowerCase();
    return this.endpoints.filter(e => String(e.id).toLowerCase().includes(q));
  }

  select(p: PsEndpointRecord) {
    this.dialogRef.close(p.id);
  }

  close() {
    this.dialogRef.close(undefined);
  }
}
