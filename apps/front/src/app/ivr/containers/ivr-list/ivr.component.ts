import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IvrApiService, IvrNodeDto } from '../../ivr.service';
import { ReactiveFormsModule } from '@angular/forms';

// Angular Material modules (incremental UI)
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  DragDropModule,
  CdkDragDrop,
} from '@angular/cdk/drag-drop';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IvrTreeNodeComponent } from '../../components/ivr-tree-node/ivr-tree-node.component';
import { IvrNodeDialogComponent } from '../../components/ivr-node-dialog/ivr-node-dialog.component';
import { IvrRootsListComponent } from '../../components/ivr-roots-list/ivr-roots-list.component';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';

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
    MatDialogModule,
    IvrRootsListComponent,
    PageLayoutComponent,
  ],
  templateUrl: './ivr.component.html',
  styleUrls: ['./ivr.component.scss'],
})
export class IvrAdminComponent {
  private api = inject(IvrApiService);
  // FormBuilder removed; modal dialog handles editing
  private dialog = inject(MatDialog);

  // expose cdk helpers

  rootNodes: IvrNodeDto[] = [];
  allNodes: IvrNodeDto[] = [];
  childrenMap: Record<string, IvrNodeDto[]> = {};
  selected?: IvrNodeDto;
  treeRoot?: IvrNodeDto; // корень для отображения дерева
  // Inline editor removed: editing is handled in modal dialog component
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

  // called when child emits reordered roots array
  handleRootsReorder(arr: IvrNodeDto[]) {
    this.rootNodes = arr;
    arr.forEach((n) => {
      if (n.id) this.api.update(n.id, { order: n.order }).subscribe({ error: () => {} });
    });
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
        this.rootNodes = (roots || []).filter((n) => !n.parentId);
        // Добавляем корневые элементы в allNodes
        this.allNodes = [...this.rootNodes];
        // НЕ загружаем детей - они загрузятся по требованию при выборе узла
      },
      error: () => {
        this.rootNodes = [];
        this.allNodes = [];
      },
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
          const newChildren = children.filter(
            (child) => !this.allNodes.find((n) => n.id === child.id)
          );
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
        },
      });
    });
  }

  loadQueues() {
    this.api.queues().subscribe({
      next: (q: any) => (this.queues = q || []),
      error: () => (this.queues = []),
    });
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
    // initialize media selection value from payload if matches known media id
    this.selectedMediaId = undefined as any;
    if (n.payload && typeof n.payload === 'string') {
      const found = this.mediaList.find(
        (m) => m.filename === n.payload || m.id === n.payload
      );
      if (found) this.selectedMediaId = found.id;
    }
    // Загружаем детей выбранного узла для отображения в дереве
    if (!n.parentId) {
      this.loadNodeChildren(n.id);
    }
  }

  loadMediaList() {
    this.api.mediaList().subscribe({
      next: (m: any) => (this.mediaList = m || []),
      error: () => (this.mediaList = []),
    });
  }

  onMediaSelect(id: string | null) {
    this.selectedMediaId = id;
    if (!this.selected) return;
    // when selecting media from page, if a node is selected update its payload locally
    // (this keeps inline page in sync; dialog is canonical for edits)
    // Note: actual persist is done via modal; this is only UI convenience
    (this.selected as any).payload = id ? String(id) : null;
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedFile = undefined;
      return;
    }
    const f = input.files[0];
    // validate type and size: only .wav and <= 8MB
    const allowed = ['wav'];
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      this.mediaError = 'Только WAV формат разрешён';
      this.selectedFile = undefined;
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      this.mediaError = 'Файл слишком большой (макс. 8MB)';
      this.selectedFile = undefined;
      return;
    }
    this.mediaError = null;
    this.selectedFile = f;
  }

  uploadSelectedFile() {
    if (!this.selectedFile) return;
    const fd = new FormData();
    fd.append('file', this.selectedFile, this.selectedFile.name);
    this.api.uploadMedia(fd).subscribe({
      next: () => {
        this.selectedFile = undefined;
        this.loadMediaList();
      },
      error: () => {},
    });
  }

  deleteMedia(id: string) {
    if (!confirm('Удалить медиа?')) return;
    this.api
      .deleteMedia(id)
      .subscribe({ next: () => this.loadMediaList(), error: () => {} });
  }

  renameMedia(id: string) {
    const name = prompt('Новое имя медиа');
    if (!name) return;
    this.api
      .renameMedia(id, name)
      .subscribe({ next: () => this.loadMediaList(), error: () => {} });
  }

  // Устаревший метод - оставлен для обратной совместимости
  // loadChildren is deprecated — use loadNodeChildren / handleLoadChildren instead

  dropChildren(ev: CdkDragDrop<IvrNodeDto[]>) {
    // Deprecated: children drag/drop is handled by child components now.
    // Keep method for compatibility but no-op to avoid runtime errors if invoked.
    const id = this.selected?.id;
    if (!id) return;
    // no-op: ordering is performed by child; parent persists via other handlers
  }

  newRoot() {
    const ref = this.dialog.open(IvrNodeDialogComponent, {
      data: {},
      maxHeight: '80vh',
    });
    ref.afterClosed().subscribe((res: IvrNodeDto | undefined) => {
      if (!res) return;
      // handle deletion result from dialog
      if ((res as any).deletedId) {
        const delId = (res as any).deletedId as string;
        this.removeNodeAndChildren(delId);
        if (this.selected?.id === delId) {
          this.selected = undefined;
        }
        return;
      }
      // append node locally (same logic as save)
      this.allNodes = [...this.allNodes, res];
      if (res.parentId) {
        const existing = this.childrenMap[res.parentId] || [];
        this.childrenMap = {
          ...this.childrenMap,
          [res.parentId]: [...existing, res],
        };
      } else {
        this.rootNodes = [...this.rootNodes, res];
      }
    });
  }

  newChild() {
    const parentId = this.selected?.id;
    const ref = this.dialog.open(IvrNodeDialogComponent, {
      data: { node: { parentId } as IvrNodeDto },
    });
    ref.afterClosed().subscribe((res: IvrNodeDto | undefined) => {
      if (!res) return;
      this.allNodes = [...this.allNodes, res];
      if (res.parentId) {
        const existing = this.childrenMap[res.parentId] || [];
        this.childrenMap = {
          ...this.childrenMap,
          [res.parentId]: [...existing, res],
        };
      } else {
        this.rootNodes = [...this.rootNodes, res];
      }
    });
  }

  // Note: save/create/edit flows are handled in the modal dialog component.
  // This component maintains local state and optimistic updates when dialogs close.

  del() {
    if (!this.selected || !this.selected.id) return;

    // Проверяем, есть ли дочерние элементы
    const hasChildren = this.allNodes.some((n) => n.parentId === this.selected!.id);
    const confirmMessage = hasChildren
      ? 'Этот элемент имеет дочерние элементы. Вы уверены, что хотите удалить его вместе со всеми дочерними элементами?'
      : 'Вы уверены, что хотите удалить этот элемент?';

    if (!confirm(confirmMessage)) return;

    const deletedId = this.selected.id;
    const parentId = this.selected.parentId;

    this.api.remove(deletedId).subscribe(() => {
      // Рекурсивно удаляем все дочерние элементы из локального состояния
      this.removeNodeAndChildren(deletedId);

      // Выбираем родительский элемент, если он есть
      if (parentId) {
        const parent =
          this.allNodes.find((n) => n.id === parentId) ||
          this.rootNodes.find((n) => n.id === parentId);
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
    const children = this.allNodes.filter((n) => n.parentId === nodeId);

    // Рекурсивно удаляем детей
    children.forEach((child) => {
      if (child.id) {
        this.removeNodeAndChildren(child.id);
      }
    });

    // Удаляем из allNodes
    this.allNodes = this.allNodes.filter((n) => n.id !== nodeId);

    // Удаляем из rootNodes если это корневой
    this.rootNodes = this.rootNodes.filter((n) => n.id !== nodeId);

    // Удаляем из childrenMap всех родителей
    Object.keys(this.childrenMap).forEach((parentKey) => {
      this.childrenMap[parentKey] = this.childrenMap[parentKey].filter(
        (n) => n.id !== nodeId
      );
    });

    // Удаляем собственные дочерние элементы из childrenMap
    delete this.childrenMap[nodeId];
  }

  cancelEdit() {
    // No inline editor to cancel; keep behavior for compatibility
    this.selected = undefined;
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
    return this.allNodes.filter((n) => n.parentId === nodeId);
  }

  findRootNode(node: IvrNodeDto): IvrNodeDto | undefined {
    let current = node;
    // Идем вверх по дереву пока не найдем корень
    while (current.parentId) {
      const parent = this.allNodes.find((n) => n.id === current.parentId);
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
    const ref = this.dialog.open(IvrNodeDialogComponent, {
      data: { node },
      maxHeight: '80vh',
    });
    ref.afterClosed().subscribe((res: IvrNodeDto | undefined) => {
      if (!res) return;
      // immutable update for allNodes
      this.allNodes = this.allNodes.map((n) =>
        n.id === res.id ? { ...n, ...res } : n
      );

      // immutable update for rootNodes
      if (!res.parentId) {
        this.rootNodes = this.rootNodes.map((n) =>
          n.id === res.id ? { ...n, ...res } : n
        );
      }

      // immutable update for childrenMap
      if (res.parentId) {
        const siblings = this.childrenMap[res.parentId] || [];
        const newSiblings = siblings.map((n) =>
          n.id === res.id ? { ...n, ...res } : n
        );
        this.childrenMap = { ...this.childrenMap, [res.parentId]: newSiblings };
      }
    });
  }

  onNodeDelete(node: IvrNodeDto) {
    this.selected = node;
    this.del();
  }
}
