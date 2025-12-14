import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-softphone-dial-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  host: { 'class': 'dialer-section content-section' },
  styles: [
    `
    .number-input { position: relative; margin-bottom: 1.5rem; }
    .number-input .number-display { width: 100%; padding: 1rem 4rem 1rem 1rem; border: 2px solid rgba(229,231,235,0.8); border-radius: 1rem; background: white; font-size: 1.25rem; font-weight: 600; color: #1f2937; text-align: center; letter-spacing: 0.1em; }
    .input-actions { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); display: flex; gap: 0.25rem; }
    .action-button { width: 1.75rem; height: 1.75rem; border-radius: 0.375rem; border: none; background: rgba(156,163,175,0.1); color: #6b7280; display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .dialpad { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.375rem; margin-bottom: 1rem; }
    .dial-button { width: 100%; height: 3rem; aspect-ratio: 1; border-radius: 0.5rem; border: 2px solid rgba(229,231,235,0.8); background: white; color: #1f2937; font-size: 1rem; font-weight: 600; display:flex; align-items:center; justify-content:center; }
    .call-button { width:100%; padding:0.625rem; border-radius:0.5rem; background: linear-gradient(135deg,#10b981 0%,#059669 100%); color:white; border:none; font-size:0.875rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.5rem; cursor:pointer; }
    `
  ],
  template: `
  <div>
    <div class="number-input">
      <input [(ngModel)]="localCallee" (ngModelChange)="onCalleeChange($event)" [title]="localCallee" placeholder="Введите номер" class="number-display" />
      <div class="input-actions">
        <button *ngIf="localCallee" (click)="removeLast.emit()" class="action-button" title="Удалить последний символ"><span class="material-icons">backspace</span></button>
        <button *ngIf="localCallee" (click)="clearNumber.emit()" class="action-button" title="Очистить номер"><span class="material-icons">close</span></button>
      </div>
    </div>
    <div class="dialpad">
      <button *ngFor="let key of keys" (click)="onPressKey(key)" class="dial-button">{{ key }}</button>
    </div>
    <button (click)="call.emit()" [disabled]="!localCallee" class="call-button"><span class="material-icons">call</span>Позвонить</button>
  </div>
  `,
})
export class SoftphoneDialTabComponent implements OnChanges {
  @Input() callee = '';
  @Output() calleeChange = new EventEmitter<string>();
  @Output() call = new EventEmitter<void>();
  @Output() pressKey = new EventEmitter<string>();
  @Output() removeLast = new EventEmitter<void>();
  @Output() clearNumber = new EventEmitter<void>();

  localCallee = '';
  keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['callee']) this.localCallee = this.callee ?? '';
  }

  onCalleeChange(v: string) { this.calleeChange.emit(v); }
  onPressKey(k: string) { this.pressKey.emit(k); }
}
