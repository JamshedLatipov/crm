import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface PsEndpointFormData {
  mode?: 'create' | 'edit';
  payload?: any;
}

@Component({
  standalone: true,
  selector: 'app-ps-endpoint-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{
        data.mode === 'edit'
          ? 'Редактировать PJSIP endpoint'
          : 'Новый PJSIP endpoint'
      }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <div class="row">
          <mat-form-field appearance="outline"
            ><mat-label>ID</mat-label
            ><input matInput formControlName="id" required
          /></mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline">
            <mat-label>Transport</mat-label>
            <mat-select formControlName="transport">
              <mat-option value="transport-wss">transport-wss (WSS)</mat-option>
              <mat-option value="transport-udp">transport-udp (UDP)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline">
            <mat-label>Context</mat-label>
            <input matInput formControlName="context" />
          </mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline">
            <mat-label>Auth password</mat-label>
            <input matInput type="password" formControlName="auth_password" />
          </mat-form-field>
        </div>
        <div class="row two">
          <mat-form-field appearance="outline">
            <mat-label>Allow (codecs)</mat-label>
            <mat-select formControlName="allow" [multiple]="true">
              <mat-option *ngFor="let c of codecs" [value]="c">{{
                c
              }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Disallow (codecs)</mat-label>
            <mat-select formControlName="disallow" [multiple]="true">
              <mat-option *ngFor="let c of codecs" [value]="c">{{
                c
              }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="row two">
          <!-- <mat-form-field appearance="outline">
            <mat-label>Caller ID</mat-label>
            <input  matInput formControlName="callerid" />
          </mat-form-field> -->
          <mat-form-field appearance="outline">
            <mat-label>Media encryption</mat-label>
            <mat-select formControlName="media_encryption">
              <mat-option
                *ngFor="let m of mediaEncryptionOptions"
                [value]="m"
                >{{ m }}</mat-option
              >
            </mat-select>
          </mat-form-field>
        </div>
        <div class="row check">
          <mat-slide-toggle formControlName="webrtc">WebRTC</mat-slide-toggle>
          <mat-slide-toggle formControlName="ice_support">ICE</mat-slide-toggle>
          <mat-slide-toggle formControlName="force_rport"
            >Force rport</mat-slide-toggle
          >
          <mat-slide-toggle formControlName="rtp_symmetric"
            >RTP symmetric</mat-slide-toggle
          >
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Отмена</button>
        <button mat-flat-button color="primary" type="submit">
          {{ data.mode === 'edit' ? 'Сохранить' : 'Создать' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .row {
        margin-bottom: 12px;
      }
      .two {
        display: flex;
        gap: 8px;
      }
      .check {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    `,
    `
      /* Improve spacing for mat-select multi options (overlay lives outside component) */
      :host ::ng-deep .mat-select-panel .mat-option,
      :host ::ng-deep .mat-mdc-select-panel .mat-mdc-option {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      :host ::ng-deep .mat-select-panel .mat-option .mat-pseudo-checkbox,
      :host
        ::ng-deep
        .mat-mdc-select-panel
        .mat-mdc-option
        .mat-mdc-pseudo-checkbox {
        margin-right: 8px !important;
        flex: 0 0 auto !important;
      }

      :host ::ng-deep .mat-select-panel .mat-option .mat-option-text,
      :host
        ::ng-deep
        .mat-mdc-select-panel
        .mat-mdc-option
        .mat-mdc-list-item__text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
})
export class PsEndpointFormComponent {
  form: FormGroup;
  data: PsEndpointFormData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  private fb = inject(FormBuilder);
  codecs: string[] = [
    'all',
    'ulaw',
    'alaw',
    'g722',
    'opus',
    'gsm',
    'ilbc',
    'vp8',
    'h264',
  ];
  mediaEncryptionOptions: string[] = ['no', 'sdes', 'dtls'];

  constructor() {
    const p = this.data?.payload || {};
    this.form = this.fb.group({
      id: [p.id || '', Validators.required],
      transport: [p.transport || 'transport-wss'],
      aors: [p.aors || ''],
      auth: [p.auth || ''],
      auth_password: [p.auth_password || ''],
      context: [p.context || 'default'],
      disallow: [p.disallow ? p.disallow.split(',') : []],
      allow: [p.allow ? p.allow.split(',') : []],
      // callerid: [p.callerid || null,],
      media_encryption: [p.media_encryption || 'no'],
      webrtc: [p.webrtc === 'yes' || p.webrtc === true],
      ice_support: [p.ice_support === 'yes' || p.ice_support === true],
      force_rport: [p.force_rport === 'yes' || p.force_rport === true],
      rtp_symmetric: [p.rtp_symmetric === 'yes' || p.rtp_symmetric === true],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      // normalize booleans to strings where appropriate
      const val = { ...this.form.value };
      if (!val.auth) val.auth = val.id || '';
      if (!val.aors) val.aors = val.id || '';

      // convert allow/disallow arrays to comma-separated strings for backend
      if (Array.isArray(val.allow)) val.allow = val.allow.join(',');
      if (Array.isArray(val.disallow)) val.disallow = val.disallow.join(',');
      ['webrtc', 'ice_support', 'force_rport', 'rtp_symmetric'].forEach((k) => {
        if (val[k] === true) val[k] = 'yes';
        else if (val[k] === false) val[k] = 'no';
      });
      this.dialogRef.close({ confirmed: true, value: val });
    }
  }

  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }
}
