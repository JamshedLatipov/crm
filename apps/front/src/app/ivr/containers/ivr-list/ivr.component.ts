import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IvrApiService, IvrNodeDto } from '../../ivr.service';
import { FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

// Angular Material modules (incremental UI)
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IvrTreeNodeComponent } from '../../components/ivr-tree-node/ivr-tree-node.component';

const ACTIONS = ['menu', 'playback', 'dial', 'goto', 'hangup', 'queue'];

@Component({
  selector: 'app-ivr-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    DragDropModule,
    MatSelectModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    IvrTreeNodeComponent,
  ],
  templateUrl: './ivr.component.html',
  styleUrls: ['./ivr.component.scss'],
})
export class IvrAdminComponent {
  private api = inject(IvrApiService);
  private fb = inject(FormBuilder);

  // expose cdk helpers

  rootNodes: IvrNodeDto[] = [];
  allNodes: IvrNodeDto[] = [];
  children: IvrNodeDto[] = [];
  childrenMap: Record<string, IvrNodeDto[]> = {};
  selected?: IvrNodeDto;
  treeRoot?: IvrNodeDto; // корень для отображения дерева
  form?: FormGroup<any>;
  private formSub?: Subscription;
  actions = ACTIONS;
  errors: { [k: string]: string | undefined } = {};
  actionLabels: Record<string, string> = {
    menu: 'Меню',
    playback: 'Воспроизвести',
    dial: 'Набор номера',
    goto: 'Перейти',
    hangup: 'Завершить',
    queue: 'Очередь',
  };
  // media
  mediaList: { id: string; name?: string; filename?: string }[] = [];
  selectedMediaId: string | null = null;
  selectedFile?: File | null;
  // file upload validation
  mediaError?: string | null;
  // queues
  queues: { id: number; name: string }[] = [];

  constructor() {
    this.reload();
  }

  dropRoot(ev: CdkDragDrop<IvrNodeDto[]>) {
    // reorder locally
    const arr = [...this.rootNodes];
    moveItemInArray(arr, ev.previousIndex, ev.currentIndex);
    // reassign order based on index
    arr.forEach((n, idx) => (n.order = idx));
    this.rootNodes = arr;
    // persist changes for moved items (fire & forget)
    arr.forEach(
      (n) =>
        n.id &&
        this.api.update(n.id, { order: n.order }).subscribe({ error: () => {} })
    );
  }

  // children helpers
  childrenOfSelected(): IvrNodeDto[] {
    const id = this.selected?.id;
    if (!id) return [];
    return this.childrenMap[id] || [];
  }

  // дерево всегда показывает детей корня, даже когда редактируется вложенный элемент
  childrenOfTreeRoot(): IvrNodeDto[] {
    const id = this.treeRoot?.id;
    if (!id) return [];
    return this.getNodeChildren(id);
  }

  reload() {
    // Загружаем все узлы для построения дерева
    this.loadAllNodes();
    this.loadMediaList();
    this.loadQueues();
  }

  loadAllNodes() {
    this.api.roots().subscribe({
      next: (roots) => {
        // Фильтруем только корневые элементы
        this.rootNodes = (roots || []).filter(n => !n.parentId);
        // Добавляем корневые элементы в allNodes
        this.allNodes = [...this.rootNodes];
        // НЕ загружаем детей - они загрузятся по требованию при выборе узла
      },
      error: () => {
        this.rootNodes = [];
        this.allNodes = [];
      }
    });
  }

  // Обработчик события загрузки детей из дочернего компонента
  handleLoadChildren(parentId: string) {
    this.loadNodeChildren(parentId);
  }

  // Метод для ленивой загрузки детей конкретного узла
  loadNodeChildren(parentId: string): Promise<IvrNodeDto[]> {
    // Проверяем, не загружены ли уже дети
    if (this.childrenMap[parentId]) {
      return Promise.resolve(this.childrenMap[parentId]);
    }

    return new Promise((resolve) => {
      this.api.children(parentId).subscribe({
        next: (children) => {
          if (!children || children.length === 0) {
            this.childrenMap[parentId] = [];
            resolve([]);
            return;
          }
          
          // Добавляем детей в allNodes
          // Use a new array reference so child inputs/signals detect the change immediately
          const newChildren = children.filter(child => !this.allNodes.find(n => n.id === child.id));
          if (newChildren.length > 0) {
            this.allNodes = [...this.allNodes, ...newChildren];
          }
          
          // Сохраняем в childrenMap
          this.childrenMap[parentId] = children;
          resolve(children);
        },
        error: () => {
          this.childrenMap[parentId] = [];
          resolve([]);
        }
      });
    });
  }

  loadQueues() {
    this.api.queues().subscribe({ next: (q: any) => (this.queues = q || []), error: () => (this.queues = []) });
  }

  select(n: IvrNodeDto) {
    this.selected = n;
    // Сохраняем корень дерева если это корневой узел, иначе сохраняем текущий корень
    if (!n.parentId) {
      this.treeRoot = n;
    }
    // Если корень еще не установлен, находим его
    if (!this.treeRoot && n.parentId) {
      this.treeRoot = this.findRootNode(n);
    }
    this.form = this.fb.group({
      id: [n.id],
      name: [n.name],
      action: [n.action || 'menu'],
      digit: [n.digit || null],
      payload: [n.payload || null],
  queueName: [(n as IvrNodeDto).queueName || null],
      timeoutMs: [n.timeoutMs ?? 5000],
      webhookUrl: [n.webhookUrl || null],
      webhookMethod: [n.webhookMethod || null],
      backDigit: [n.backDigit || null],
      allowEarlyDtmf: [n.allowEarlyDtmf ?? true],
      repeatDigit: [n.repeatDigit || null],
      rootDigit: [n.rootDigit || null],
    });
  // try to convert existing queueName (which may be a name) into queue id
    if (this.form && n.queueName) {
      const byName = this.queues.find((q) => q.name === n.queueName);
      if (byName) this.form.patchValue({ queueName: byName.id });
      // if it's already an id string/number and matches, leave as-is
      const byId = this.queues.find((q) => String(q.id) === String(n.queueName));
      if (byId) this.form.patchValue({ queueName: byId.id });
    }
    // initialize media selection value from payload if matches known media id
    this.selectedMediaId = undefined as any;
    if (n.payload && typeof n.payload === 'string') {
      const found = this.mediaList.find((m) => m.filename === n.payload || m.id === n.payload);
      if (found) this.selectedMediaId = found.id;
    }
    // Загружаем детей выбранного узла для отображения в дереве
    if (n.id) {
      this.loadNodeChildren(n.id);
    }
    this.setupFormValidation();
  }

  loadMediaList() {
    this.api.mediaList().subscribe({ next: (m: any) => (this.mediaList = m || []), error: () => (this.mediaList = []) });
  }

  onMediaSelect(id: string | null) {
    this.selectedMediaId = id;
    if (!this.form) return;
    // set payload to media id (store id as string)
    this.form.patchValue({ payload: id ? String(id) : null });
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) { this.selectedFile = undefined; return; }
    const f = input.files[0];
    // validate type and size: only .wav and <= 8MB
    const allowed = ['wav'];
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) { this.mediaError = 'Только WAV формат разрешён'; this.selectedFile = undefined; return; }
    if (f.size > 8 * 1024 * 1024) { this.mediaError = 'Файл слишком большой (макс. 8MB)'; this.selectedFile = undefined; return; }
    this.mediaError = null;
    this.selectedFile = f;
  }

  uploadSelectedFile() {
    if (!this.selectedFile) return;
    const fd = new FormData();
    fd.append('file', this.selectedFile, this.selectedFile.name);
    this.api.uploadMedia(fd).subscribe({ next: () => { this.selectedFile = undefined; this.loadMediaList(); }, error: () => {} });
  }

  deleteMedia(id: string) {
    if (!confirm('Удалить медиа?')) return;
    this.api.deleteMedia(id).subscribe({ next: () => this.loadMediaList(), error: () => {} });
  }

  renameMedia(id: string) {
    const name = prompt('Новое имя медиа');
    if (!name) return;
    this.api.renameMedia(id, name).subscribe({ next: () => this.loadMediaList(), error: () => {} });
  }

  // Устаревший метод - оставлен для обратной совместимости
  loadChildren(parentId: string) {
    this.loadNodeChildren(parentId);
  }

  dropChildren(ev: CdkDragDrop<IvrNodeDto[]>) {
    const id = this.selected?.id;
    if (!id) return;
    const arr = [...(this.childrenMap[id] || [])];
    moveItemInArray(arr, ev.previousIndex, ev.currentIndex);
    arr.forEach((n, idx) => (n.order = idx));
    this.childrenMap[id] = arr;
    arr.forEach(
      (n) =>
        n.id &&
        this.api.update(n.id, { order: n.order }).subscribe({ error: () => {} })
    );
  }

  newRoot() {
    this.selected = undefined;
    this.form = this.fb.group({
      name: ['new root'],
      action: ['menu'],
      digit: [null],
      payload: [null],
      queueName: [null],
      timeoutMs: [5000],
      webhookUrl: [null],
      webhookMethod: [null],
      backDigit: [null],
      allowEarlyDtmf: [true],
      repeatDigit: [null],
      rootDigit: [null],
    });
    this.setupFormValidation();
  }

  newChild() {
    const parentId = this.selected?.id;
    this.selected = undefined;
    this.form = this.fb.group({
      parentId: [parentId || null],
      name: ['new child'],
      action: ['menu'],
      digit: [null],
      payload: [null],
      queueName: [null],
      timeoutMs: [5000],
      webhookUrl: [null],
      webhookMethod: [null],
      backDigit: [null],
      allowEarlyDtmf: [true],
      repeatDigit: [null],
      rootDigit: [null],
    });
    this.setupFormValidation();
  }

  private setupFormValidation() {
    // cleanup previous subscription
    if (this.formSub) { try { this.formSub.unsubscribe(); } catch (e) {} this.formSub = undefined; }
    if (!this.form) return;
    // run validate at start and on every change
    this.validate();
    this.formSub = this.form.valueChanges.subscribe(() => this.validate());
  }

  validate() {
    if (!this.form) {
      this.errors = {};
      return;
    }
    const v = this.form.value as Partial<IvrNodeDto>;
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
    // propagate errors to form controls so Angular Material shows invalid state
    // clear previous control errors we manage
    const keys = Object.keys(this.form.controls || {});
    for (const k of keys) {
      const ctrl = this.form!.get(k as any);
      if (!ctrl) continue;
      if (errs[k]) {
        // set a custom error key so mat-form-field treats it as invalid
        ctrl.setErrors({ custom: errs[k] });
      } else {
        // remove our custom error while preserving other Angular errors
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

  save() {
    if (!this.form) return;
    const val = { ...this.form.value } as IvrNodeDto;
    // coerce queueName to string or null (backend expects string)
    if (val.queueName != null) val.queueName = String(val.queueName);
    
    if (val.id) {
      // Обновление существующего элемента
      this.api.update(val.id, val).subscribe((updatedNode: IvrNodeDto) => {
        // Обновляем в allNodes
        const idx = this.allNodes.findIndex(n => n.id === val.id);
        if (idx >= 0) {
          this.allNodes[idx] = { ...this.allNodes[idx], ...updatedNode };
        }
        
        // Обновляем в rootNodes если это корневой
        if (!updatedNode.parentId) {
          const rootIdx = this.rootNodes.findIndex(n => n.id === val.id);
          if (rootIdx >= 0) {
            this.rootNodes[rootIdx] = { ...this.rootNodes[rootIdx], ...updatedNode };
          }
        }
        
        // Обновляем в childrenMap если есть родитель
        if (updatedNode.parentId) {
          const siblings = this.childrenMap[updatedNode.parentId] || [];
          const sibIdx = siblings.findIndex(n => n.id === val.id);
          if (sibIdx >= 0) {
            siblings[sibIdx] = { ...siblings[sibIdx], ...updatedNode };
            this.childrenMap[updatedNode.parentId] = [...siblings];
          }
        }
        
        // Обновляем selected без пересоздания формы
        if (this.selected?.id === val.id) {
          this.selected = { ...this.selected, ...updatedNode };
        }
        
        // Обновляем форму с новыми значениями без пересоздания
        if (this.form) {
          this.form.patchValue(updatedNode, { emitEvent: false });
        }
      });
    } else {
      // Создание нового элемента
      this.api.create(val).subscribe((newNode: IvrNodeDto) => {
        // Добавляем в allNodes
        this.allNodes.push(newNode);
        
        // Добавляем в соответствующий список
        if (newNode.parentId) {
          // Добавляем в childrenMap
          if (!this.childrenMap[newNode.parentId]) {
            this.childrenMap[newNode.parentId] = [];
          }
          this.childrenMap[newNode.parentId].push(newNode);
          
          // Если создаем дочерний элемент, сохраняем выбор родителя
          const parent = this.allNodes.find(n => n.id === newNode.parentId) || 
                        this.rootNodes.find(n => n.id === newNode.parentId);
          if (parent && this.selected?.id !== parent.id) {
            this.selected = parent;
          }
        } else {
          // Добавляем в rootNodes
          this.rootNodes.push(newNode);
        }
        
        // Обновляем форму с ID нового элемента без полного пересоздания
        if (this.form) {
          this.form.patchValue({ id: newNode.id }, { emitEvent: false });
        }
        
        // Обновляем selected только если это новый узел
        if (!this.selected || !this.selected.id) {
          this.selected = newNode;
        }
      });
    }
  }

  del() {
    if (!this.selected || !this.selected.id) return;
    
    // Проверяем, есть ли дочерние элементы
    const hasChildren = this.allNodes.some(n => n.parentId === this.selected!.id);
    const confirmMessage = hasChildren 
      ? 'Этот элемент имеет дочерние элементы. Вы уверены, что хотите удалить его вместе со всеми дочерними элементами?'
      : 'Вы уверены, что хотите удалить этот элемент?';
    
    if (!confirm(confirmMessage)) return;
    
    const deletedId = this.selected.id;
    const parentId = this.selected.parentId;
    
    this.api.remove(deletedId).subscribe(() => {
      // Рекурсивно удаляем все дочерние элементы из локального состояния
      this.removeNodeAndChildren(deletedId);
      
      // Закрываем форму редактирования
      this.form = undefined;
      
      // Выбираем родительский элемент, если он есть
      if (parentId) {
        const parent = this.allNodes.find(n => n.id === parentId) || this.rootNodes.find(n => n.id === parentId);
        if (parent) {
          this.selected = parent;
          this.select(parent);
        } else {
          this.selected = undefined;
        }
      } else {
        this.selected = undefined;
      }
    });
  }

  private removeNodeAndChildren(nodeId: string) {
    // Находим всех детей
    const children = this.allNodes.filter(n => n.parentId === nodeId);
    
    // Рекурсивно удаляем детей
    children.forEach(child => {
      if (child.id) {
        this.removeNodeAndChildren(child.id);
      }
    });
    
    // Удаляем из allNodes
    this.allNodes = this.allNodes.filter(n => n.id !== nodeId);
    
    // Удаляем из rootNodes если это корневой
    this.rootNodes = this.rootNodes.filter(n => n.id !== nodeId);
    
    // Удаляем из childrenMap всех родителей
    Object.keys(this.childrenMap).forEach(parentKey => {
      this.childrenMap[parentKey] = this.childrenMap[parentKey].filter(n => n.id !== nodeId);
    });
    
    // Удаляем собственные дочерние элементы из childrenMap
    delete this.childrenMap[nodeId];
  }

  cancelEdit() {
    this.selected = undefined;
    this.form = undefined;
    if (this.formSub) {
      try {
        this.formSub.unsubscribe();
      } catch (e) {}
      this.formSub = undefined;
    }
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

  getNodeChildren(nodeId?: string): IvrNodeDto[] {
    if (!nodeId) return [];
    return this.allNodes.filter(n => n.parentId === nodeId);
  }

  findRootNode(node: IvrNodeDto): IvrNodeDto | undefined {
    let current = node;
    // Идем вверх по дереву пока не найдем корень
    while (current.parentId) {
      const parent = this.allNodes.find(n => n.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  onNodeSelect(node: IvrNodeDto) {
    this.select(node);
  }

  onNodeAddChild(node: IvrNodeDto) {
    this.selected = node;
    // Сохраняем корень дерева перед добавлением дочернего
    if (!node.parentId) {
      this.treeRoot = node;
    } else if (!this.treeRoot) {
      this.treeRoot = this.findRootNode(node);
    }
    this.newChild();
  }

  onNodeEdit(node: IvrNodeDto) {
    this.select(node);
  }

  onNodeDelete(node: IvrNodeDto) {
    this.selected = node;
    this.del();
  }
}
