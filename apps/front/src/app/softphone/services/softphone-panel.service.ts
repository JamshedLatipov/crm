import { Injectable, signal } from '@angular/core';

/**
 * Service managing softphone panel UI state (size, position, pinning, dock offset)
 */
@Injectable({ providedIn: 'root' })
export class SoftphonePanelService {
  // Expand/collapse state
  expanded = signal(true);
  
  // Pin (dock) to the right side
  pinned = signal(false);
  
  // Panel size (user-resizable)
  panelWidth = signal<number | undefined>(undefined);
  panelHeight = signal<number | undefined>(undefined);
  panelResizing = signal(false);
  
  // Storage keys
  private readonly expandedStorageKey = 'softphone.expanded';
  private readonly pinStorageKey = 'softphone.pinned';
  private readonly panelSizeStorageKey = 'softphone.panelSize';
  
  // Size constraints
  readonly minWidthPx = 320; // 20rem
  readonly minHeightPx = 384; // 24rem
  
  private panelResizeSaveTimer: number | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedExpanded = localStorage.getItem(this.expandedStorageKey);
      if (savedExpanded !== null) this.expanded.set(savedExpanded === '1');
      
      const savedPinned = localStorage.getItem(this.pinStorageKey);
      if (savedPinned !== null) this.pinned.set(savedPinned === '1');
      
      const savedSizeRaw = localStorage.getItem(this.panelSizeStorageKey);
      if (savedSizeRaw) {
        const parsed = JSON.parse(savedSizeRaw) as { w?: unknown; h?: unknown };
        const w = typeof parsed.w === 'number' ? parsed.w : Number(parsed.w);
        const h = typeof parsed.h === 'number' ? parsed.h : Number(parsed.h);
        if (Number.isFinite(w) && w > 0) this.panelWidth.set(Math.round(w));
        if (Number.isFinite(h) && h > 0) this.panelHeight.set(Math.round(h));
      }
    } catch {
      // ignore
    }
  }

  toggleExpanded() {
    const next = !this.expanded();
    this.expanded.set(next);
    try {
      localStorage.setItem(this.expandedStorageKey, next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  togglePinned() {
    const next = !this.pinned();
    this.pinned.set(next);
    try {
      localStorage.setItem(this.pinStorageKey, next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  setPanelSize(width: number, height: number) {
    this.panelWidth.set(Math.round(width));
    this.panelHeight.set(Math.round(height));
    this.scheduleSavePanelSize(Math.round(width), Math.round(height));
  }

  private scheduleSavePanelSize(w: number, h: number) {
    if (this.panelResizeSaveTimer !== null) {
      window.clearTimeout(this.panelResizeSaveTimer);
    }
    this.panelResizeSaveTimer = window.setTimeout(() => {
      try {
        const safeW = Math.round(
          Math.max(
            this.minWidthPx,
            Number.isFinite(w) && w > 0 ? w : this.panelWidth() ?? this.minWidthPx
          )
        );
        const safeH = Math.round(
          Math.max(
            this.minHeightPx,
            Number.isFinite(h) && h > 0 ? h : this.panelHeight() ?? this.minHeightPx
          )
        );
        localStorage.setItem(
          this.panelSizeStorageKey,
          JSON.stringify({ w: safeW, h: safeH })
        );
      } catch {
        // ignore
      }
    }, 250);
  }

  persistPanelSizeNow(measuredWidth?: number, measuredHeight?: number) {
    const rawW = this.panelWidth();
    const rawH = this.panelHeight();
    const w = Number.isFinite(rawW) && rawW && rawW > 0 ? rawW : measuredWidth;
    const h = Number.isFinite(rawH) && rawH && rawH > 0 ? rawH : measuredHeight;
    if (!Number.isFinite(w) || !Number.isFinite(h) || !w || !h) return;
    try {
      localStorage.setItem(
        this.panelSizeStorageKey,
        JSON.stringify({
          w: Math.round(Math.max(this.minWidthPx, w)),
          h: Math.round(Math.max(this.minHeightPx, h)),
        })
      );
    } catch {
      // ignore
    }
  }

  applyDockOffset(expandedPanelEl: HTMLElement | null, isScriptsExpanded: boolean) {
    // Only reserve space when panel is actually visible
    if (!this.expanded() || !this.pinned()) {
      this.clearDockOffset();
      return;
    }

    // Don't reserve space in fullscreen scripts mode
    if (isScriptsExpanded) {
      this.clearDockOffset();
      return;
    }

    const measuredWidth = expandedPanelEl?.getBoundingClientRect().width;
    const width = Math.round(
      (Number.isFinite(measuredWidth) && measuredWidth && measuredWidth > 0
        ? measuredWidth
        : this.panelWidth() ?? 480)
    );

    try {
      document.documentElement.style.setProperty(
        '--softphone-dock-width',
        `${Math.max(0, width)}px`
      );
    } catch {
      // ignore
    }
  }

  clearDockOffset() {
    try {
      document.documentElement.style.setProperty('--softphone-dock-width', '0px');
    } catch {
      // ignore
    }
  }

  cleanup() {
    if (this.panelResizeSaveTimer !== null) {
      try {
        window.clearTimeout(this.panelResizeSaveTimer);
      } catch {
        // ignore
      }
      this.panelResizeSaveTimer = null;
    }
  }
}
