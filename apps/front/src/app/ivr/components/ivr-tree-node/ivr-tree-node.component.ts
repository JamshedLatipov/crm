import { Component, Input, Output, EventEmitter, input, signal, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IvrNodeDto } from '../../ivr.service';

@Component({
  selector: 'app-ivr-tree-node',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './ivr-tree-node.component.html',
  styleUrls: ['./ivr-tree-node.component.scss'],
})
export class IvrTreeNodeComponent {
  node = input.required<IvrNodeDto>();
  children = input<IvrNodeDto[]>([]);
  selectedId = input<string | null>(null);
  level = input<number>(0);
  actionLabels = input<Record<string, string>>({});
  allNodes = input<IvrNodeDto[]>([]);
  lazyLoad = input<boolean>(true); // Включить ленивую загрузку

  onSelect = output<IvrNodeDto>();
  onAddChild = output<IvrNodeDto>();
  onEdit = output<IvrNodeDto>();
  onDelete = output<IvrNodeDto>();
  onLoadChildren = output<string>(); // Запрос загрузки детей

  loadedChildren = signal<IvrNodeDto[]>([]);

  expanded = signal(false);
  childrenLoaded = signal(false);

  private wasSelected = signal(false);
  private hadChildren = signal(false); // Флаг что у узла были/есть дети

  // Computed signals so template auto-tracks and updates immediately
  isSelected = computed(() => this.node().id === this.selectedId());
  constructor() {
    // Effect: react to selection changes (also handles initial state)
    effect(() => {
      const nowSelected = this.isSelected();
      if (nowSelected && !this.wasSelected()) {
        this.expanded.set(true);
        this.loadChildren();
        this.wasSelected.set(true);
      }
    });

    // Effect: react to updates in allNodes and update loaded children if needed
    effect(() => {
      const _all = this.allNodes(); // track allNodes
      const childrenFromAll = this.getNodeChildren(this.node().id);
      if (childrenFromAll.length > 0 && !this.childrenLoaded()) {
        this.loadedChildren.set(childrenFromAll);
        this.childrenLoaded.set(true);
      } else if (this.childrenLoaded()) {
        // Если дети уже загружены, обновляем их
        this.loadedChildren.set(childrenFromAll);
      }
    });

    // Effect: update hadChildren flag without writing during render
    effect(() => {
      // prefer explicit values from node, loaded children, or allNodes
      const nodeHas = this.node().hasChildren;
      const loaded = this.loadedChildren();
      const fromAll = this.allNodes() && this.allNodes().some(n => n.parentId === this.node().id);

      if (loaded && loaded.length > 0) {
        this.hadChildren.set(true);
        return;
      }

      if (nodeHas !== undefined && nodeHas) {
        this.hadChildren.set(true);
        return;
      }

      if (fromAll) {
        this.hadChildren.set(true);
        return;
      }
    });
  }


  // computed signal for hasChildren
  hasChildren = computed(() => {
    // Если ранее определили что у узла есть дети - сохраняем это
    if (this.hadChildren()) {
      return true;
    }

    // Если дети уже загружены, проверяем их наличие
    if (this.childrenLoaded()) {
      const loaded = this.loadedChildren();
      const hasKids = !!(loaded && loaded.length > 0);
      return hasKids;
    }

    // Если есть признак hasChildren из API - используем его
    if (this.node().hasChildren !== undefined) {
      return !!this.node().hasChildren;
    }

    // Если не загружены, проверяем в allNodes
    if (this.allNodes() && this.allNodes().length > 0) {
      const hasKids = this.allNodes().some(n => n.parentId === this.node().id);
      return hasKids;
    }
    
    // По умолчанию не показываем кнопку expand
    return false;
  });

  childrenCount = computed(() => {
    if (this.childrenLoaded()) {
      return this.loadedChildren()?.length || 0;
    }

    if (this.allNodes() && this.allNodes().length > 0) {
      return this.allNodes().filter(n => n.parentId === this.node().id).length;
    }
    
    // Неизвестно точное количество до загрузки
    return 0;
  });

  actionLabel = computed(() => {
    const labels = this.actionLabels();
    return labels[this.node().action] || this.node().action;
  });

  hasAdditionalInfo = computed(() => {
    return !!(
      this.node().queueName ||
      this.node().payload ||
      this.node().webhookUrl ||
      this.node().timeoutMs ||
      this.node().backDigit ||
      this.node().repeatDigit ||
      this.node().rootDigit ||
      this.node().allowEarlyDtmf ||
      this.node().digit
    );
  });

  shouldShowDetails = computed(() => {
    // Показываем секцию details если:
    // 1. Есть дополнительная информация ИЛИ
    // 2. Есть (или могут быть) дочерние элементы ИЛИ
    // 3. Узел выбран (чтобы показать expand при загрузке детей) ИЛИ
    // 4. Уже загружены дети
    return (
      this.hasAdditionalInfo() || this.hasChildren() || this.isSelected() || this.childrenLoaded()
    );
  });

  toggleExpand(event: Event) {
    event.stopPropagation();
    this.expanded.set(!this.expanded());

    // Загружаем детей при первом раскрытии
    if (this.expanded() && !this.childrenLoaded() && this.lazyLoad()) {
      this.loadChildren();
    }
  }

  private loadChildren() {
    if (!this.lazyLoad()) {
      this.loadedChildren.set(this.children());
      this.childrenLoaded.set(true);
      return;
    }

    // Сначала проверяем в allNodes
    const childrenFromAll = this.getNodeChildren(this.node().id);
    if (childrenFromAll.length > 0) {
      this.loadedChildren.set(childrenFromAll);
      this.childrenLoaded.set(true);
      return;
    }

    // Если нет в allNodes - запрашиваем загрузку у родителя (smart component)
    if (this.node().id) {
      this.onLoadChildren.emit(this.node().id);
      // Устанавливаем флаг загрузки, данные придут через allNodes effect
      this.childrenLoaded.set(false);
    }
  }

  getNodeChildren(nodeId?: string): IvrNodeDto[] {
    if (!nodeId || !this.allNodes() || this.allNodes().length === 0) return [];
    return this.allNodes().filter(n => n.parentId === nodeId);
  }
}
