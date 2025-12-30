import { Component, input, output, OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, inject, effect, computed, HostListener } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaskModalService } from '../../../tasks/services/task-modal.service';
import { CallScriptsService } from '../../../shared/services/call-scripts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';

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
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSlideToggle],
  templateUrl: './softphone-scripts-panel.component.html',
  styleUrls: ['./softphone-scripts-panel.component.scss'],
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class SoftphoneScriptsPanelComponent implements OnChanges {
  callActive = input<boolean>(false);
  showScripts = input<boolean>(false);
  scripts = input<Script[]>([]);
  selectedBranch = input<string | null>(null);
  // Local selection and UI state
  localSelected = signal<string | null>(null);
  branchNote = signal('');
  createTaskToggle = signal(false);
  // local writable copy of scripts (parent input may be readonly)
  localScripts = signal<Script[]>([]);
  private readonly callScriptsSvc = inject(CallScriptsService);
  private readonly taskModal = inject(TaskModalService);

  toggleScripts = output<void>();
  // Emit when user selects a branch (leaf script)
  selectBranch = output<string | null>();
  // Emit when user requests manual CDR/register log — includes branchId, note and createTask flag
  registerCdr = output<{ branchId?: string | null; note?: string; createTask?: boolean }>();
  // Emit when view mode changes
  viewModeChange = output<'compact' | 'fullscreen'>();
  // Emit when viewed script changes
  viewedScriptChange = output<any>();

  // Local UI state
  activeTab = signal<'all' | 'recent' | 'bookmarked'>('all');
  search = signal('');
  expandedCategories = signal<Record<string, boolean>>({});
  expandedNodes = signal<Record<string, boolean>>({});
  // View mode: 'compact' (default) or 'fullscreen' for better script reading
  viewMode = signal<'compact' | 'fullscreen'>('compact');
  // Currently viewed script for detail panel (separate from selection for CDR)
  viewedScript = signal<Script | null>(null);

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
    // Keep localSelected in sync with parent-provided selectedBranch
    effect(() => {
      try {
        this.localSelected.set(this.selectedBranch());
      } catch {
        // ignore
      }
    });
  }

  // Computed list of leaf scripts (branches) for selector — stable across change detection
  branches = computed(() => {
    const out: { id: string; title: string }[] = [];
    const collect = (s: Script) => {
      if (!s.children || s.children.length === 0) {
        out.push({ id: s.id, title: s.title });
      } else {
        s.children.forEach((c) => collect(c));
      }
    };
    (this.localScripts() || []).forEach((s) => collect(s));
    return out;
  });

  // Called from template when user selects branch option
  onSelectBranch(id: string | null) {
    try {
      this.selectBranch.emit(id);
    } catch {
      // ignore
    }
  }

  selectLeaf(script: Script) {
    try {
      // toggle selection if same clicked  
      const cur = this.localSelected();
      const newId = cur === script.id ? null : script.id;
      this.localSelected.set(newId);
      // reset note and toggle when deselected
      if (!newId) {
        this.branchNote.set('');
        this.createTaskToggle.set(false);
      }
      this.selectBranch.emit(newId);
    } catch (e) {
      // ignore
    }
  }

  saveForSelected() {
    try {
      const bid = this.localSelected();
      const payload = { branchId: bid, note: this.branchNote(), createTask: this.createTaskToggle() };
      console.log('saveForSelected emitting registerCdr:', payload);
      this.registerCdr.emit(payload);
      // clear local UI after save
      this.localSelected.set(null);
      this.branchNote.set('');
      this.createTaskToggle.set(false);
    } catch (e) {
      console.error('saveForSelected failed', e);
      // ignore
    }
  }

  cancelSelection() {
    try {
      this.localSelected.set(null);
      this.branchNote.set('');
      this.createTaskToggle.set(false);
    } catch {
      // ignore
    }
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

  toggleViewMode() {
    const current = this.viewMode();
    const newMode = current === 'compact' ? 'fullscreen' : 'compact';
    this.viewMode.set(newMode);
    try {
      this.viewModeChange.emit(newMode);
    } catch {}
  }

  viewScriptDetails(script: Script) {
    // Show script details in side panel
    this.viewedScript.set(script);
    try {
      this.viewedScriptChange.emit(script);
    } catch {}
  }

  closeScriptDetails() {
    this.viewedScript.set(null);
    try {
      this.viewedScriptChange.emit(null);
    } catch {}
  }

  // Helper to check if script has any content to display
  hasScriptContent(script: Script): boolean {
    return !!(script.steps?.length || script.questions?.length || script.tips?.length);
  }

  // Keyboard shortcuts for better UX
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // ESC key - close details or fullscreen
    if (event.key === 'Escape') {
      if (this.viewedScript()) {
        event.preventDefault();
        this.closeScriptDetails();
      } else if (this.viewMode() === 'fullscreen') {
        event.preventDefault();
        this.toggleViewMode();
      }
    }
    
    // Ctrl/Cmd+F - toggle fullscreen (if search is not focused)
    if (event.key === 'f' && (event.altKey || event.metaKey)) {
      const target = event.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (!isInputFocused) {
        event.preventDefault();
        this.toggleViewMode();
      }
    }
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