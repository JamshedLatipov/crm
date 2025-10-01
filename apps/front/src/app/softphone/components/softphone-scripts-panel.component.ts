import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ScriptItem {
  id: string;
  title: string;
  content: string;
  favorite?: boolean;
  lastUsed?: Date; // used for "recent" ordering/filtering
}

type TabKey = 'all' | 'recent' | 'favorites';

@Component({
  selector: 'app-softphone-scripts-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div *ngIf="callActive" class="bg-[var(--surface-color)] rounded-lg p-6 flex flex-col shadow-sm">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 class="text-2xl font-bold">Сценарии вызова</h2>
        <label class="relative block">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">search</span>
          <input
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange()"
            class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md pl-10 pr-4 py-2 text-sm focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] w-64"
            placeholder="Поиск сценариев..."
            type="text"
            aria-label="Поиск сценария"
          />
        </label>
      </div>

      <!-- Tabs -->
      <div class="border-b border-[var(--border-color)] mb-4">
        <div class="flex items-center" role="tablist" aria-label="Фильтр сценариев">
          <button
            type="button"
            (click)="setTab('all')"
            [attr.aria-selected]="activeTab==='all'"
            class="px-2 py-2 text-sm font-medium border-b-2 transition-colors"
            [ngClass]="activeTab==='all' ? 'text-[var(--primary-color)] border-[var(--primary-color)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'"
            role="tab"
          >Все</button>
          <button
            type="button"
            (click)="setTab('recent')"
            [attr.aria-selected]="activeTab==='recent'"
            class="px-2 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
            [ngClass]="activeTab==='recent' ? 'text-[var(--primary-color)] border-[var(--primary-color)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'"
            role="tab"
          >
            <span class="material-icons text-lg -ml-1 mr-1">history</span>
            <span>Недавние</span>
          </button>
          <button
            type="button"
            (click)="setTab('favorites')"
            [attr.aria-selected]="activeTab==='favorites'"
            class="px-2 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
            [ngClass]="activeTab==='favorites' ? 'text-[var(--primary-color)] border-[var(--primary-color)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'"
            role="tab"
          >
            <span class="material-icons text-lg -ml-1 mr-1 text-yellow-500">bookmark</span>
            <span>Избранные</span>
          </button>
        </div>
      </div>

      <!-- List & Content -->
      <div class="flex-1 overflow-y-auto pt-2 pr-4 -mr-4">
        <ng-container *ngIf="filteredScripts.length; else emptyState">
          <div class="space-y-4">
            <div *ngIf="showRecentSection">
              <h3 class="text-sm font-semibold text-[var(--text-secondary)] px-2 mb-2 flex items-center gap-2">
                <span class="material-icons text-base">history</span>
                <span>Недавно использованные</span>
              </h3>
              <div class="space-y-1">
                <button
                  *ngFor="let s of recentScripts; trackBy: trackById"
                  type="button"
                  (click)="selectScript(s)"
                  class="flex w-full items-center gap-2 cursor-pointer py-1.5 px-2 rounded-md text-left"
                  [ngClass]="selected?.id===s.id ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-[var(--muted-color)]'"
                >
                  <span class="font-medium text-sm line-clamp-1">{{ s.title }}</span>
                  <span
                    (click)="toggleFavorite(s); $event.stopPropagation()"
                    (keydown.enter)="toggleFavorite(s); $event.stopPropagation()"
                    (keydown.space)="toggleFavorite(s); $event.stopPropagation(); $event.preventDefault()"
                    tabindex="0"
                    role="button"
                    class="material-icons text-lg ml-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] rounded"
                    [ngClass]="selected?.id===s.id ? 'text-white' : s.favorite ? 'text-yellow-500' : 'text-[var(--text-secondary)] hover:text-yellow-500'"
                    aria-label="Избранное переключить"
                  >bookmark</span>
                </button>
              </div>
            </div>
            <div *ngIf="showRecentSection" class="border-t border-[var(--border-color)] my-4"></div>

            <div>
              <div class="text-sm font-medium text-[var(--text-secondary)] mb-2">Сценарий</div>
              <div *ngIf="selected; else placeholder"
                   class="bg-[var(--muted-color)] border border-[var(--border-color)] rounded-md p-3 text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed h-32 overflow-auto">
                <p>{{ selected.content }}</p>
              </div>
              <ng-template #placeholder>
                <div class="bg-[var(--muted-color)] border border-dashed border-[var(--border-color)] rounded-md p-3 text-sm text-[var(--text-secondary)] h-32 flex items-center justify-center text-center">
                  Выберите сценарий из списка или введите запрос для поиска.
                </div>
              </ng-template>
            </div>
          </div>
        </ng-container>
        <ng-template #emptyState>
          <div class="text-center text-sm text-[var(--text-secondary)] py-8">
            Сценарии не найдены.
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class SoftphoneScriptsPanelComponent implements OnChanges {
  @Input() callActive = false;
  /** Full list of scripts provided by parent; if empty uses internal defaults */
  @Input() scripts: ScriptItem[] = [];
  /** Optional externally selected script id */
  @Input() selectedId?: string;

  @Output() scriptSelected = new EventEmitter<ScriptItem>();
  @Output() favoriteChange = new EventEmitter<ScriptItem>();

  query = '';
  activeTab: TabKey = 'all';
  selected: ScriptItem | null = null;

  // Internal fallback demo data to preserve prior visual (only used if parent supplies none)
  private readonly defaultScripts: ScriptItem[] = [
    {
      id: 'status-check',
      title: 'Проверка статуса заявки',
      content: '"Я могу проверить статус вашей заявки. Не могли бы вы предоставить номер заявки?"\n(Если клиент не имеет номера заявки, попросите полное имя и дату рождения для поиска)',
      favorite: true,
      lastUsed: new Date(Date.now() - 1000 * 60 * 2)
    },
    {
      id: 'contact-update',
      title: 'Обновление контактной информации',
      content: '"Давайте обновим контактные данные. Подскажите, пожалуйста, актуальный номер телефона и email."',
      favorite: false,
      lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 3)
    }
  ];

  get allScripts(): ScriptItem[] { return (this.scripts && this.scripts.length ? this.scripts : this.defaultScripts); }

  get filteredScripts(): ScriptItem[] {
    let list = this.allScripts;
    if (this.activeTab === 'recent') {
      list = list.filter(s => !!s.lastUsed).sort((a, b) => (b.lastUsed?.getTime()||0) - (a.lastUsed?.getTime()||0));
    } else if (this.activeTab === 'favorites') {
      list = list.filter(s => s.favorite);
    }
    if (this.query.trim()) {
      const q = this.query.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q));
    }
    return list;
  }

  get recentScripts(): ScriptItem[] {
    // Show top 5 recent scripts from current filtered list (excluding favorites filter so user always sees recents section when on All) when in 'all'
    if (this.activeTab !== 'all') return [];
    const byRecent = this.allScripts.filter(s => s.lastUsed).sort((a, b) => (b.lastUsed?.getTime()||0) - (a.lastUsed?.getTime()||0));
    return byRecent.slice(0, 5);
  }

  get showRecentSection(): boolean {
    return this.activeTab === 'all' && this.recentScripts.length > 0;
  }

  setTab(tab: TabKey) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    // Reset selection if selection no longer visible
  const currentId = this.selected?.id;
  if (currentId && !this.filteredScripts.some(s => s.id === currentId)) this.selected = null;
  }

  onQueryChange() {
  const currentId = this.selected?.id;
  if (currentId && !this.filteredScripts.some(s => s.id === currentId)) this.selected = null;
  }

  selectScript(s: ScriptItem) {
    this.selected = s;
    this.scriptSelected.emit(s);
    // update recency
    s.lastUsed = new Date();
  }

  toggleFavorite(s: ScriptItem) {
    s.favorite = !s.favorite;
    this.favoriteChange.emit(s);
  }

  trackById(_: number, item: ScriptItem) { return item.id; }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedId'] && this.selectedId) {
      const match = this.allScripts.find(s => s.id === this.selectedId);
      if (match) this.selected = match;
    }
    if (changes['scripts'] && this.selected) {
      // ensure selected still exists after scripts list change
      if (!this.allScripts.some(s => s.id === this.selected?.id)) {
        this.selected = null;
      }
    }
  }
}
