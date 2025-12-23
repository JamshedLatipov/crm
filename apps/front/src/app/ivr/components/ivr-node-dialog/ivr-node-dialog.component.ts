import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmActionDialogComponent } from '../../../shared/dialogs/confirm-action-dialog.component';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { IvrApiService, IvrNodeDto } from '../../ivr.service';

@Component({
  selector: 'app-ivr-node-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './ivr-node-dialog.component.html',
  styleUrls: ['./ivr-node-dialog.component.scss'],
})
export class IvrNodeDialogComponent {
  private dialogRef = inject(MatDialogRef<IvrNodeDialogComponent>);
  private readonly dialog = inject(MatDialog);
  public readonly dialogData = inject(MAT_DIALOG_DATA) as
    | { node?: IvrNodeDto }
    | undefined;
  private fb = inject(FormBuilder);
  private api = inject(IvrApiService);

  form = this.fb.group({
    id: [this.dialogData?.node?.id || null],
    parentId: [this.dialogData?.node?.parentId || null],
    name: [this.dialogData?.node?.name || ''],
    action: [this.dialogData?.node?.action || 'menu'],
    digit: [this.dialogData?.node?.digit || null],
    payload: [this.dialogData?.node?.payload || null],
    allowEarlyDtmf: [this.dialogData?.node?.allowEarlyDtmf ?? true],
    timeoutMs: [this.dialogData?.node?.timeoutMs ?? 5000],
    queueName: [this.dialogData?.node?.queueName ?? null],
    webhookUrl: [this.dialogData?.node?.webhookUrl ?? null],
    webhookMethod: [this.dialogData?.node?.webhookMethod ?? null],
    backDigit: [this.dialogData?.node?.backDigit ?? null],
    repeatDigit: [this.dialogData?.node?.repeatDigit ?? null],
    rootDigit: [this.dialogData?.node?.rootDigit ?? null],
  });

  queues: { id: number; name: string }[] = [];
  mediaList: { id: string; name?: string; filename?: string }[] = [];
  selectedMediaId: string | null = null;
  selectedFile?: File | null;
  mediaError?: string | null;
  errors: { [k: string]: string | undefined } = {};
  private formSub?: any;
  isSaving = false;
  actions = ['menu', 'playback', 'dial', 'goto', 'hangup', 'queue'];
  actionLabels: Record<string, string> = {
    menu: 'Меню',
    playback: 'Воспроизвести',
    dial: 'Набор номера',
    goto: 'Перейти',
    hangup: 'Завершить',
    queue: 'Очередь',
  };

  get selected() {
    return { id: this.form.value.id } as any;
  }

  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      menu: 'menu',
      playback: 'play_circle',
      dial: 'call',
      goto: 'arrow_forward',
      hangup: 'call_end',
      queue: 'support_agent',
    };
    return icons[action] || 'settings';
  }

  cancelEdit() {
    this.dialogRef.close();
  }

  del() {
    const id = this.form.value.id;
    if (!id) return;
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '420px',
      data: {
        title: 'Удалить элемент',
        message: 'Удалить этот элемент?',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.api.remove(id).subscribe({ next: () => this.dialogRef.close({ deletedId: id }), error: () => {} });
    });
  }

  constructor() {
    // load auxiliary data
    this.api.queues().subscribe({ next: (q: any) => (this.queues = q || []) });
    this.api
      .mediaList()
      .subscribe({ next: (m: any) => (this.mediaList = m || []) });
    // initialize selectedMediaId if payload matches
    const payload = this.dialogData?.node?.payload;
    if (payload && typeof payload === 'string') this.selectedMediaId = payload;
    this.setupFormValidation();
  }

  onMediaSelect(id: string | null) {
    this.selectedMediaId = id;
    this.form.patchValue({ payload: id ? String(id) : null });
  }

  private setupFormValidation() {
    if (this.formSub) {
      try {
        this.formSub.unsubscribe();
      } catch (e) {}
    }
    this.validate();
    this.formSub = this.form.valueChanges.subscribe(() => this.validate());
  }

  private validate() {
    const v = this.form.value as Partial<IvrNodeDto> & { action?: string };
    const errs: { [k: string]: string | undefined } = {};
    if (
      v.action &&
      ['playback', 'dial', 'goto'].includes(v.action) &&
      !v.payload
    )
      errs['payload'] = 'Payload required for this action';
    if (v.digit && !/^[0-9*#]$/.test(v.digit as string))
      errs['digit'] = 'Digit must be 0-9, * or #';
    this.errors = errs;
    // propagate to controls for visual invalid state
    const keys = Object.keys(this.form.controls || {});
    for (const k of keys) {
      const ctrl: any = this.form.get(k as any);
      if (!ctrl) continue;
      if (errs[k]) ctrl.setErrors({ custom: errs[k] });
      else {
        const current = ctrl.errors || null;
        if (current) {
          if (current['custom']) {
            const copy = { ...current };
            delete copy['custom'];
            const hasOther = Object.keys(copy).length > 0;
            ctrl.setErrors(hasOther ? copy : null);
          }
        }
      }
    }
  }

  hasErrors() {
    return Object.keys(this.errors).some((k) => !!this.errors[k]);
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedFile = undefined;
      return;
    }
    const f = input.files[0];
    const allowed = ['wav'];
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      this.mediaError = 'Только WAV формат разрешён';
      this.selectedFile = undefined;
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      this.mediaError = 'Файл слишком большой (макс. 8MB)';
      this.selectedFile = undefined;
      return;
    }
    this.mediaError = null;
    this.selectedFile = f;
  }

  uploadSelectedFile() {
    if (!this.selectedFile) return;
    const fd = new FormData();
    fd.append('file', this.selectedFile, this.selectedFile.name);
    this.api.uploadMedia(fd).subscribe({
      next: () => {
        this.selectedFile = undefined;
        this.api
          .mediaList()
          .subscribe({ next: (m: any) => (this.mediaList = m || []) });
      },
      error: () => {},
    });
  }

  renameMedia(id: string) {
    const name = prompt('Новое имя медиа');
    if (!name) return;
    this.api.renameMedia(id, name).subscribe({
      next: () =>
        this.api
          .mediaList()
          .subscribe({ next: (m: any) => (this.mediaList = m || []) }),
      error: () => {},
    });
  }

  deleteMedia(id: string) {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '420px',
      data: {
        title: 'Удалить медиа',
        message: 'Удалить медиа?',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.api.deleteMedia(id).subscribe({
        next: () => {
          this.mediaList = this.mediaList.filter((m) => m.id !== id);
          if (this.selectedMediaId === id) {
            this.selectedMediaId = null;
            this.form.patchValue({ payload: null });
          }
        },
        error: () => {},
      });
    });
  }

  onDelete() {
    const id = this.form.value.id;
    if (!id) return;
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '420px',
      data: {
        title: 'Удалить узел',
        message: 'Удалить этот узел?',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.api.remove(id).subscribe({ next: () => this.dialogRef.close({ deletedId: id }), error: () => {} });
    });
  }

  onClose() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.hasErrors()) {
      // mark user-visible feedback
      alert('Пожалуйста исправьте ошибки в форме перед сохранением');
      return;
    }
    const val = { ...this.form.value } as IvrNodeDto;
    // mark all controls as touched so validation messages appear
    try {
      this.form.markAllAsTouched();
    } catch (e) {}
    // coerce queueName to string if present
    if (val.queueName != null) val.queueName = String(val.queueName);
    // if a media is selected, ensure payload is set to media id
    if (this.selectedMediaId) val.payload = String(this.selectedMediaId);

    console.debug('IVR save payload:', val);
    this.isSaving = true;
    if (val.id) {
      this.api.update(val.id, val).subscribe({
        next: (updated) => {
          console.debug('IVR update response:', updated);
          this.isSaving = false;
          this.dialogRef.close(updated);
        },
        error: (err) => {
          this.isSaving = false;
          console.error('IVR update error:', err);
        },
      });
    } else {
      this.api.create(val).subscribe({
        next: (created) => {
          console.debug('IVR create response:', created);
          this.isSaving = false;
          this.dialogRef.close(created);
        },
        error: (err) => {
          this.isSaving = false;
          console.error('IVR create error:', err);
        },
      });
    }
  }
}
