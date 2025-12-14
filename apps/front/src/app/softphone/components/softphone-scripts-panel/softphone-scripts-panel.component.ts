import { Component, input, output, OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { CallScriptsService } from '../../../shared/services/call-scripts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Script {
  id: string;
  title: string;
  description?: string;
  steps?: string[];
  questions?: string[];
  tips?: string[];
  category?: string; // optional grouping
  bookmarked?: boolean;
  recentlyUsed?: boolean;
  children?: Script[];
}

@Component({
  selector: 'app-softphone-scripts-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './softphone-scripts-panel.component.html',
  styleUrls: ['./softphone-scripts-panel.component.scss'],
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default
})
export class SoftphoneScriptsPanelComponent implements OnChanges {
  callActive = input<boolean>(false);
  showScripts = input<boolean>(false);
  scripts = input<Script[]>([]);
  // local writable copy of scripts (parent input may be readonly)
  localScripts = signal<Script[]>([]);
  private readonly callScriptsSvc = inject(CallScriptsService);

  toggleScripts = output<void>();

  // Local UI state
  activeTab = signal<'all' | 'recent' | 'bookmarked'>('all');
  search = signal('');
  expandedCategories = signal<Record<string, boolean>>({});
  expandedNodes = signal<Record<string, boolean>>({});

  constructor() {
    // Auto-expand nodes when search is active
    effect(() => {
      const q = this.search().toLowerCase().trim();
      if (q) {
        // Collect all script IDs that should be expanded
        const toExpand: Record<string, boolean> = {};
        const collectExpandable = (script: Script) => {
          if (script.children?.length) {
            toExpand[script.id] = true;
            script.children.forEach(child => collectExpandable(child));
          }
        };
        
        this.localScripts().forEach(script => collectExpandable(script));
        this.expandedNodes.set(toExpand);
      }
    });
  }

  trackByScriptId(index: number, script: Script): string {
    return script.id;
  }

  toggleCategory(cat: string) {
    const cur = this.expandedCategories();
    this.expandedCategories.set({ ...cur, [cat]: !cur[cat] });
  }

  toggleNode(scriptId: string) {
    const cur = this.expandedNodes();
    this.expandedNodes.set({ ...cur, [scriptId]: !cur[scriptId] });
  }

  isNodeExpanded(scriptId: string): boolean {
    return !!this.expandedNodes()[scriptId];
  }

  toggleBookmark(script: Script) {
    // emit an event later if needed; for now toggle locally if present
    script.bookmarked = !script.bookmarked;
  }

  // Recursive helper to check if script or any of its children match search query
  private matchesSearch(script: Script, q: string): boolean {
    if (!q) return true;
    
    const titleMatch = (script.title || '').toLowerCase().includes(q);
    const descMatch = (script.description || '').toLowerCase().includes(q);
    
    if (titleMatch || descMatch) return true;
    
    // Check children recursively
    if (script.children?.length) {
      return script.children.some(child => this.matchesSearch(child, q));
    }
    
    return false;
  }

  // Recursive helper to filter tree preserving structure
  private filterScriptTree(script: Script, q: string): Script | null {
    // Filter children first
    const filteredChildren: Script[] = [];
    if (script.children?.length) {
      for (const child of script.children) {
        const filteredChild = this.filterScriptTree(child, q);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      }
    }

    // Check if current node matches
    const titleMatch = (script.title || '').toLowerCase().includes(q);
    const descMatch = (script.description || '').toLowerCase().includes(q);
    const nodeMatches = titleMatch || descMatch;

    // Include node if it matches OR has matching children
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...script,
        children: filteredChildren
      };
    }

    return null;
  }

  filteredScripts(): Script[] {
    const q = this.search().toLowerCase().trim();
    let list = this.localScripts() || [];
    
    // Apply tab filters first
    if (this.activeTab() === 'recent') list = list.filter(s => s.recentlyUsed);
    if (this.activeTab() === 'bookmarked') list = list.filter(s => s.bookmarked);
    
    // Apply search filter with tree preservation
    if (q) {
      const filtered: Script[] = [];
      for (const script of list) {
        const filteredScript = this.filterScriptTree(script, q);
        if (filteredScript) {
          filtered.push(filteredScript);
        }
      }
      return filtered;
    }
    
    return list;
  }

  categories(): Record<string, Script[]> {
    const map: Record<string, Script[]> = {};
    for (const s of this.filteredScripts()) {
      const cat = s.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    }
    return map;
  }

  // Return category keys for template iteration (AOT-safe)
  categoriesKeys(): string[] {
    return Object.keys(this.categories());
  }

  ngOnChanges(changes: SimpleChanges) {
    // If parent didn't provide scripts, load on demand when panel opens
    try {
      // If parent provided scripts, keep local copy in sync
      if (changes['scripts'] && this.scripts() && this.scripts().length > 0) {
        this.localScripts.set(this.scripts());
        // auto-expand all categories when parent provides scripts
        const cats = this.categoriesKeys();
        const expanded: Record<string, boolean> = {};
        for (const c of cats) expanded[c] = true;
        this.expandedCategories.set(expanded);
      }
      // If panel opened and no scripts provided, load from service
      if (changes['showScripts'] && this.showScripts() && (!this.scripts() || this.scripts().length === 0)) {
        this.loadActiveScripts();
      }
    } catch {
      // ignore
    }
  }

  private loadActiveScripts() {
    try {
      this.callScriptsSvc.getCallScriptsTree(true).subscribe(list => {
        const mapNode = (s: any): Script => ({
          id: s.id,
          title: s.title,
          description: s.description,
          steps: s.steps,
          questions: s.questions,
          tips: s.tips,
          category: s.category?.name || s.category || null,
          bookmarked: false,
          recentlyUsed: false,
          children: (s.children || []).map((c: any) => mapNode(c)),
        });
        const mapped = (list || []).map((s: any) => mapNode(s));
        this.localScripts.set(mapped as any);
        // auto-expand categories after loading
        const cats = this.categoriesKeys();
        const expanded: Record<string, boolean> = {};
        for (const c of cats) expanded[c] = true;
        this.expandedCategories.set(expanded);
      }, err => {
        // swallow error; parent already logs
      });
    } catch {
      // ignore
    }
  }

  // Expose local scripts getter for template compatibility
  scriptsForTemplate(): Script[] {
    return this.localScripts() || [];
  }
}