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
    <div class="tabs-container" role="tablist" aria-label="Status tabs">
      <button
        *ngFor="let t of effectiveTabs; trackBy: trackByValue"
        type="button"
        class="tab-button"
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
    .tabs-container {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: #f8fafc;
      border-radius: 12px;
      width: fit-content;
    }

    .tab-button {
      padding: 8px 20px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      display: inline-flex;
      gap: 8px;
      align-items: center;
      position: relative;
    }

    .tab-button:hover:not(.active):not(:disabled) {
      background: rgba(100, 116, 139, 0.08);
      color: #475569;
    }

    .tab-button.active {
      background: white;
      color: #4285f4;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08),
                  0 1px 2px rgba(0, 0, 0, 0.06);
    }

    .tab-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .label { 
      white-space: nowrap; 
    }

    .count {
      background: rgba(66, 133, 244, 0.12);
      color: #4285f4;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }

    .tab-button.active .count {
      background: rgba(66, 133, 244, 0.15);
      color: #4285f4;
    }
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
