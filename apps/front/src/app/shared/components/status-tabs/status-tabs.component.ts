import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

/**
 * Universal status tabs component.
 * - Accepts a configurable `tabs` array (label + value [+ count]) so it can be reused
 *   in contacts, leads, users, deals, etc.
 * - Keeps the original behavior by providing sensible defaults.
 */
export interface StatusTab {
  label: string; // visible label
  value: string | null; // value emitted (null represents "All")
  count?: number; // optional badge/count to display
  disabled?: boolean;
}

@Component({
  selector: 'app-status-tabs',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="tabs" role="tablist" aria-label="Status tabs">
      <button
        *ngFor="let t of effectiveTabs; trackBy: trackByValue"
        type="button"
        class="tab"
        [class.active]="selected === t.value"
        [attr.aria-pressed]="selected === t.value"
        [disabled]="t.disabled"
        (click)="onSelect(t.value)">
        <span class="label">{{ t.label }}</span>
        <span *ngIf="showCounts && t.count != null" class="count">{{ t.count }}</span>
      </button>
    </div>
  `,
  styles: [
    `
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid #e1e4e8;
      align-items: center;
    }

    .tab {
      background: none;
      border: none;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      color: #6c757d;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s ease;
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }

    .tab.active {
      color: #2f78ff;
      border-bottom-color: #2f78ff;
    }

    .tab:hover {
      color: #2f78ff;
    }

    .count {
      background: rgba(47,120,255,0.08);
      color: #2f78ff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .label { white-space: nowrap; }
  `,
  ],
})
export class StatusTabsComponent implements OnInit {
  /**
   * Currently selected tab value. Use `null` for "All".
   */
  @Input() selected: string | null = null;

  /**
   * Optional array of tabs. If omitted, a sensible default (Все / Открытые / Выигранные / Проигранные)
   * is used so the component remains backward compatible with existing callers.
   */
  @Input() tabs?: StatusTab[];

  /**
   * Emit when selection changes.
   */
  @Output() selectedChange = new EventEmitter<string | null>();

  /**
   * When true, clicking the currently active tab will deselect it (emit null).
   * Default: false (keeps previous behavior).
   */
  @Input() allowDeselect = false;

  /**
   * When true, shows per-tab counts if provided in the `tabs` array.
   */
  @Input() showCounts = false;

  effectiveTabs: StatusTab[] = [];

  private readonly defaultTabs: StatusTab[] = [
    { label: 'Все', value: null },
    { label: 'Открытые', value: 'open' },
    { label: 'Выигранные', value: 'won' },
    { label: 'Проигранные', value: 'lost' },
  ];

  ngOnInit(): void {
    this.effectiveTabs = this.tabs && this.tabs.length ? this.tabs : this.defaultTabs;
  }

  onSelect(value: string | null) {
    if (this.selected === value) {
      if (this.allowDeselect) {
        this.selected = null;
        this.selectedChange.emit(null);
      }
      return; // no change
    }

    this.selected = value;
    this.selectedChange.emit(this.selected);
  }

  trackByValue(_idx: number, item: StatusTab) {
    return item.value === null ? '__all' : item.value;
  }
}
