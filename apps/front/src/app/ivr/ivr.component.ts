import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IvrApiService, IvrNodeDto } from './ivr.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

const ACTIONS = ['menu','playback','dial','goto','hangup','queue'];

@Component({
  selector: 'app-ivr-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  template: `
  <div class="p-4 space-y-4 text-sm">
    <h1 class="text-xl font-semibold flex items-center gap-3 flex-wrap">IVR Admin
      <button class="bg-blue-600 text-white px-2 py-1 rounded" (click)="reload()">Reload</button>
      <button class="bg-indigo-600 text-white px-2 py-1 rounded" (click)="toggleReorder()">{{reorderMode() ? 'Done Reorder' : 'Reorder'}}</button>
      <button class="bg-green-600 text-white px-2 py-1 rounded" (click)="newRoot()">Add Root</button>
    </h1>
    <div class="flex gap-4">
      <div class="w-1/3 border rounded p-2 h-[75vh] overflow-auto space-y-2">
        <div class="text-xs uppercase text-gray-500">Root Nodes</div>
        <ul cdkDropList (cdkDropListDropped)="dropRoot($event)" class="mt-1 space-y-1">
          <li *ngFor="let n of rootNodes(); let i = index" cdkDrag (click)="select(n)" (keyup.enter)="select(n)" tabindex="0" [class.font-bold]="selected()?.id===n.id" class="cursor-pointer hover:bg-blue-50 px-1 rounded outline-none focus:ring flex items-center gap-1" [class.bg-yellow-50]="reorderMode()">
            <span *ngIf="reorderMode()" class="cursor-move text-gray-400" cdkDragHandle>::</span>
            <span>{{i+1}}.</span> <span>{{n.name}} ({{n.action}})</span>
          </li>
        </ul>
        <div *ngIf="selectedRootChildren().length" class="mt-4">
          <div class="text-xs uppercase text-gray-500 flex items-center justify-between">Children
            <span *ngIf="digitConflicts().length" class="text-red-600 font-medium" title="Duplicate digits">Conflicts: {{digitConflicts().join(',')}}</span>
          </div>
          <ul cdkDropList (cdkDropListDropped)="dropChildren($event)" class="mt-1 space-y-1">
            <li *ngFor="let c of selectedRootChildren(); let ci = index" cdkDrag (click)="select(c); $event.stopPropagation()" (keyup.enter)="select(c); $event.stopPropagation()" tabindex="0" class="cursor-pointer hover:bg-blue-50 px-1 rounded outline-none focus:ring flex items-center gap-1" [class.bg-yellow-50]="reorderMode()" [class.text-red-600]="conflictDigitsSet().has(c.digit||'')">
              <span *ngIf="reorderMode()" class="cursor-move text-gray-400" cdkDragHandle>::</span>
              <span>{{ci+1}}.</span>
              <span>{{c.digit || '•'}} → {{c.name}} ({{c.action}})</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="flex-1 space-y-4">
        <form *ngIf="form" [formGroup]="form" (ngSubmit)="save()" class="grid gap-2 grid-cols-2 border rounded p-3 bg-gray-50">
          <div class="col-span-2 font-medium" aria-label="Node Editor">Node Editor <span *ngIf="hasErrors()" class="text-red-600 ml-2">(Fix validation errors)</span></div>
          <div class="col-span-1">
            <span class="text-xs uppercase">Name</span>
            <input class="w-full border rounded px-2 py-1" formControlName="name" required />
          </div>
          <div>
            <span class="text-xs uppercase">Digit</span>
            <input class="w-full border rounded px-2 py-1" formControlName="digit" maxlength="1" />
            <div class="text-[11px] text-red-600" *ngIf="errors()['digit']">{{errors()['digit']}}</div>
          </div>
          <div>
            <span class="text-xs uppercase">Action</span>
            <select class="w-full border rounded px-2 py-1" formControlName="action">
              <option *ngFor="let a of actions" [value]="a">{{a}}</option>
            </select>
          </div>
          <div class="col-span-2">
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase">Payload / Media</span>
              <small class="text-[11px] text-gray-500">Select uploaded sound or enter custom payload</small>
            </div>
            <div class="flex gap-2 mt-1">
              <select #mediaSel class="flex-1 border rounded px-2 py-1" [value]="form.value.payload" (change)="onMediaSelect(mediaSel.value)">
                <option value="">-- none --</option>
                <option *ngFor="let m of mediaList()" [value]="mediaPayload(m.filename)">{{m.name}}</option>
              </select>
              <input class="w-56 border rounded px-2 py-1" formControlName="payload" placeholder="or enter payload" />
            </div>
            <div class="mt-2 flex items-center gap-2">
              <input #fileInput type="file" accept="audio/*" />
              <button class="bg-blue-600 text-white px-2 py-1 rounded" type="button" (click)="upload(fileInput.files)">Upload</button>
            </div>
            <div class="text-[11px] text-red-600" *ngIf="errors()['payload']">{{errors()['payload']}}</div>
          </div>
          <div>
            <span class="text-xs uppercase">Timeout (ms)</span>
            <input type="number" class="w-full border rounded px-2 py-1" formControlName="timeoutMs" />
            <div class="text-[11px] text-red-600" *ngIf="errors()['timeoutMs']">{{errors()['timeoutMs']}}</div>
          </div>
          <div>
            <span class="text-xs uppercase">Webhook URL</span>
            <input class="w-full border rounded px-2 py-1" formControlName="webhookUrl" />
          </div>
          <div>
            <span class="text-xs uppercase">Webhook Method</span>
            <input class="w-full border rounded px-2 py-1" formControlName="webhookMethod" />
          </div>
          <div>
            <span class="text-xs uppercase">Back Digit</span>
            <input class="w-full border rounded px-2 py-1" formControlName="backDigit" />
          </div>
          <div class="col-span-2">
            <span class="text-xs uppercase">Order</span>
            <input type="number" class="w-full border rounded px-2 py-1" formControlName="order" />
          </div>
          <div class="col-span-2 flex gap-2 mt-2">
            <button class="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-40" [disabled]="hasErrors()" type="submit">Save</button>
            <button class="bg-red-600 text-white px-3 py-1 rounded" type="button" (click)="del()" *ngIf="selected()">Delete</button>
            <button class="bg-blue-600 text-white px-3 py-1 rounded" type="button" (click)="newChild()" *ngIf="selected()?.id">Add Child</button>
            <button class="bg-indigo-600 text-white px-3 py-1 rounded" type="button" (click)="newRoot()">Add Root</button>
          </div>
          <div class="col-span-2 flex items-center gap-2 mt-1">
            <input type="checkbox" formControlName="allowEarlyDtmf" id="allowEarlyDtmf" />
            <label for="allowEarlyDtmf" class="text-xs uppercase">Allow Early DTMF During Prompt</label>
          </div>
          <div class="col-span-1">
            <span class="text-xs uppercase">Repeat Digit</span>
            <input class="w-full border rounded px-2 py-1" formControlName="repeatDigit" maxlength="1" />
          </div>
          <div class="col-span-1">
            <span class="text-xs uppercase">Root Digit</span>
            <input class="w-full border rounded px-2 py-1" formControlName="rootDigit" maxlength="1" />
          </div>
        </form>
        <div *ngIf="form" class="border rounded p-3">
          <div class="font-medium mb-2">Preview / Path</div>
          <div class="text-xs mb-2">{{breadcrumbLabel()}}</div>
          <div *ngIf="previewChildren().length" class="text-xs">
            <div class="font-semibold">Children</div>
            <div *ngFor="let c of previewChildren()" class="flex gap-2" [class.text-red-600]="conflictDigitsSet().has(c.digit||'')">
              <span class="w-4 text-right">{{c.digit||'•'}}</span>
              <span>{{c.name}} ({{c.action}})</span>
            </div>
          </div>
        </div>
        <div *ngIf="!form" class="text-gray-500">Select or create a node.</div>
      </div>
    </div>
  </div>
  `,
  styles: [`:host{display:block}`]
})
export class IvrAdminComponent {
  private api = inject(IvrApiService);
  private fb = inject(FormBuilder);
  actions = ACTIONS;

  rootNodes = signal<IvrNodeDto[]>([]);
  childrenMap = signal<Record<string,IvrNodeDto[]>>({});
  mediaList = signal<{id:string;name:string;filename:string}[]>([]);
  selected = signal<IvrNodeDto|undefined>(undefined);
  reorderMode = signal(false);
  selectionHistory = signal<IvrNodeDto[]>([]);

  // Derived data
  selectedRootChildren = computed(() => {
    const s = this.selected();
    if(!s) return [] as IvrNodeDto[];
    return this.childrenMap()[s.id||''] || [];
  });

  breadcrumb = computed<IvrNodeDto[]>(() => {
    const s = this.selected();
    if(!s) return [] as IvrNodeDto[];
    const all = [ ...this.rootNodes(), ...Object.values(this.childrenMap()).flat() ];
    const map = new Map(all.filter(n=>n.id).map(n=>[n.id as string, n] as const));
    const chain: IvrNodeDto[] = [];
    let cur: IvrNodeDto|undefined = s;
    const guard = 50;
    let i=0;
    while(cur && i<guard){ chain.unshift(cur); cur = cur.parentId ? map.get(cur.parentId) : undefined; i++; }
    return chain;
  });

  breadcrumbLabel = computed(()=> this.breadcrumb().map(b => b.name).join(' / '));

  previewChildren = computed(()=> this.selectedRootChildren());

  conflictDigitsSet = computed(()=>{
    const siblings = this.selectedRootChildren();
    const counts: Record<string, number> = {};
    siblings.forEach(s=>{ if(s.digit) counts[s.digit]=(counts[s.digit]||0)+1; });
    return new Set(Object.keys(counts).filter(d=>counts[d]>1));
  });

  digitConflicts = computed(()=> Array.from(this.conflictDigitsSet()));

  errors = signal<{[k:string]:string|undefined}>({});
  form?: ReturnType<FormBuilder['group']>;

  constructor(){ this.reload(); }

  mediaPayload(filename: string) {
    return 'custom/' + filename.replace(/\.[^.]+$/, '');
  }

  onMediaSelect(val: string) {
    if (!this.form) return;
    this.form.patchValue({ payload: val });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upload(files: any) {
    if(!files || files.length === 0) return;
    const f = files[0];
    const fd = new FormData();
    fd.append('file', f);
    this.api.uploadMedia(fd).subscribe(()=>{
      this.api.mediaList().subscribe(m=> this.mediaList.set(m || []));
    });
  }

  reload(){
    this.api.roots().subscribe(rs => {
      // Ensure only true roots (parentId null) displayed
      const filtered = rs.filter(r => !r.parentId);
      this.rootNodes.set(filtered);
      this.childrenMap.set({});
      filtered.forEach(r => { if(r.id) this.loadChildren(r.id); });
  // load media
  this.api.mediaList().subscribe(m=> this.mediaList.set(m || []));
    });
  }
  loadChildren(id: string){
    this.api.children(id).subscribe(ch => {
      this.childrenMap.update(m => ({...m, [id]: ch}));
    });
  }
  select(n: IvrNodeDto){
    this.selected.set(n);
  this.selectionHistory.update(h=>[...h.slice(-19), n]);
    this.form = this.fb.group({
      id: [n.id],
      name: [n.name],
      digit: [n.digit],
      action: [n.action],
      payload: [n.payload],
      order: [n.order ?? 0],
      timeoutMs: [n.timeoutMs ?? 5000],
      webhookUrl: [n.webhookUrl],
      webhookMethod: [n.webhookMethod],
      backDigit: [n.backDigit],
  allowEarlyDtmf: [ n.allowEarlyDtmf ?? true ],
  repeatDigit: [ n.repeatDigit || null ],
  rootDigit: [ n.rootDigit || null ],
      parentId: [n.parentId ?? null]
    });
    if(n.id) this.loadChildren(n.id);
  this.form.valueChanges.subscribe(()=>this.validate());
  this.validate();
  }
  newRoot(){
    this.selected.set(undefined);
  this.form = this.fb.group({ name: ['root'], action:['menu'], digit:[null], payload:[null], order:[0], timeoutMs:[5000], webhookUrl:[null], webhookMethod:[null], backDigit:[null], allowEarlyDtmf:[true], repeatDigit:[null], rootDigit:[null], parentId:[null] });
  }
  newChild(){
    const parent = this.selected();
    if(!parent) return;
    // Если родитель ещё не сохранён (нет id) — сначала сохранить его, затем открыть форму ребёнка
    if(!parent.id && this.form){
      const parentVal = { ...this.form.value } as IvrNodeDto;
      // Валидация перед сохранением
      this.validate();
      if(this.hasErrors()) return;
      this.api.create(parentVal).subscribe(saved => {
        // Обновляем выбранного
        this.reload();
        // Ждём чуть позже чтобы reload подтянул id
        setTimeout(()=>{
          const updated = this.rootNodes().find(r=>r.id===saved.id);
          if(updated) this.select(updated);
          if(saved.id) this.openChildForm(saved.id);
        },150);
      });
      return;
    }
  if(parent.id) this.openChildForm(parent.id);
  }

  private openChildForm(parentId: string){
  this.form = this.fb.group({ name: ['new-node'], action:['playback'], digit:[null], payload:[null], order:[0], timeoutMs:[5000], webhookUrl:[null], webhookMethod:[null], backDigit:[null], allowEarlyDtmf:[true], repeatDigit:[null], rootDigit:[null], parentId:[parentId] });
    this.form.valueChanges.subscribe(()=>this.validate());
    this.validate();
  }
  save(){
    if(!this.form) return;
    const val = { ...this.form.value } as IvrNodeDto;
  this.validate();
  if(this.hasErrors()) return;
    if(val.id){
      this.api.update(val.id, val).subscribe(n => {
        this.reload();
        const sel = this.rootNodes().find(r=>r.id===n.id) || Object.values(this.childrenMap()).flat().find(c=>c.id===n.id);
        if(sel) this.select(sel);
      });
    } else {
      this.api.create(val).subscribe(n => {
        this.reload();
        this.select(n);
      });
    }
  }
  del(){
    const n = this.selected();
    if(!n || !n.id) return;
    this.api.remove(n.id).subscribe(()=>{ this.reload(); this.selected.set(undefined); this.form=undefined; });
  }

  toggleReorder(){ this.reorderMode.update(v=>!v); }

  dropRoot(ev: CdkDragDrop<IvrNodeDto[]>) {
    if(!this.reorderMode()) return;
    const arr = [...this.rootNodes()];
    moveItemInArray(arr, ev.previousIndex, ev.currentIndex);
    // Reassign order sequentially
    arr.forEach((n,i)=> n.order = i);
    this.rootNodes.set(arr);
    // Persist sequentially (fire & forget)
    arr.forEach(n=> n.id && this.api.update(n.id,{order:n.order}).subscribe());
  }

  dropChildren(ev: CdkDragDrop<IvrNodeDto[]>) {
    if(!this.reorderMode()) return;
    const sib = [...this.selectedRootChildren()];
    moveItemInArray(sib, ev.previousIndex, ev.currentIndex);
    sib.forEach((n,i)=> n.order = i);
  const sel = this.selected(); if(sel?.id){ this.childrenMap.update(m=>({...m,[sel.id as string]:sib})); }
    sib.forEach(n=> n.id && this.api.update(n.id,{order:n.order}).subscribe());
  }

  validate(){
    if(!this.form){ this.errors.set({}); return; }
    const v = this.form.value as IvrNodeDto;
    const errs: {[k:string]:string|undefined} = {};
    const action = v.action;
  if(action && ['playback','dial','goto'].includes(action) && !v['payload']){ errs['payload'] = 'Payload required for '+action; }
  if(action==='menu' && (v['timeoutMs']==null || (v['timeoutMs'] as number)<=0)) errs['timeoutMs'] = 'Timeout required for menu';
  if(v['parentId'] && !v['digit']) errs['digit'] = 'Digit required for child node';
  if(v['digit'] && !/^[0-9*#]$/.test(v['digit'] as string)) errs['digit'] = 'Digit must be one of 0-9 * #';
  if(this.conflictDigitsSet().has((v['digit'] as string)||'')) errs['digit'] = 'Digit conflicts with sibling';

    // Validate special navigation digits uniqueness
    const specials: Record<string,string> = {};
    (['backDigit','repeatDigit','rootDigit'] as const).forEach(k => {
      const val = v[k];
      if(val){
        if(!/^[0-9*#]$/.test(val)) errs[k] = 'Must be 0-9 * #';
        if(specials[val]) errs[k] = 'Conflicts with '+specials[val];
        specials[val] = k;
      }
    });
    if(action==='menu'){
      const children = this.childrenMap()[v.id||''] || [];
      const childDigits = new Set(children.map(c=>c.digit).filter(Boolean) as string[]);
      (['backDigit','repeatDigit','rootDigit'] as const).forEach(k => {
        const val = v[k];
        if(val && childDigits.has(val)) errs[k] = 'Collides with child digit';
      });
    }
    this.errors.set(errs);
  }

  hasErrors(){ return Object.keys(this.errors()).some(k=>this.errors()[k]); }
}
