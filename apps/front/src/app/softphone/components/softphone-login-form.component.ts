import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-softphone-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <div>
        <label for="sipUser" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">SIP логин</label>
        <div class="relative">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">person</span>
          <input [(ngModel)]="sipUser" (ngModelChange)="sipUserChange.emit($event)" id="sipUser" name="sipUser"
            class="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md pl-10 pr-3 py-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
            placeholder="operator1" />
        </div>
      </div>
      <div>
        <label for="sipPassword" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">SIP пароль</label>
        <div class="relative">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">lock</span>
          <input [(ngModel)]="sipPassword" (ngModelChange)="sipPasswordChange.emit($event)" id="sipPassword" name="sipPassword" type="password"
            class="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md pl-10 pr-3 py-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
            placeholder="operator1pass" />
        </div>
      </div>
      <div>
        <label for="callee" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Кому звонить</label>
        <div class="relative">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">call</span>
          <input [(ngModel)]="callee" (ngModelChange)="calleeChange.emit($event)" id="callee" name="callee"
            class="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md pl-10 pr-3 py-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
            placeholder="2002" />
        </div>
      </div>
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <span class="material-icons text-yellow-400">warning</span>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">Для совершения звонков требуется доступ к микрофону. Пожалуйста, разрешите доступ при запросе браузера.</p>
          </div>
        </div>
      </div>
      <div *ngIf="microphoneError" class="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-2">
        <div class="flex items-center">
          <span class="material-icons text-red-500 mr-2">error</span>
          <p class="text-sm text-red-700 flex-1">Доступ к микрофону отклонен. Разрешите доступ в настройках браузера.</p>
        </div>
        <div class="mt-2 flex gap-2">
          <button class="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200" (click)="dismissMicError.emit()">Закрыть</button>
          <button class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200" (click)="retryMic.emit()">Повторить</button>
        </div>
      </div>
    </div>
  `
})
export class SoftphoneLoginFormComponent {
  @Input() sipUser = '';
  @Input() sipPassword = '';
  @Input() callee = '';
  @Input() microphoneError = false;
  @Output() sipUserChange = new EventEmitter<string>();
  @Output() sipPasswordChange = new EventEmitter<string>();
  @Output() calleeChange = new EventEmitter<string>();
  @Output() retryMic = new EventEmitter<void>();
  @Output() dismissMicError = new EventEmitter<void>();
}
