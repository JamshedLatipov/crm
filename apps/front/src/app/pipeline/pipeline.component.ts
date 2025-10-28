import { Component, OnInit, OnDestroy, inject, ElementRef, viewChild, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipelineService } from './pipeline.service';
import { DealsService } from './deals.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Deal, Stage, PipelineAnalytics, StageType, DealStatus } from './dtos';
import { AnalyticsModalComponent } from './analytics-modal/analytics-modal.component';
import { DealContactSelectorComponent } from './deal-contact-selector.component';
import { AutomationSettingsComponent } from './automation-settings/automation-settings.component';
import { DealStatusComponent, DealStatus as DealStatusType } from '../shared/components/deal-status/deal-status.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule, 
    ScrollingModule,
    MatIconModule, 
    MatButtonModule, 
    MatTooltipModule, 
    DealStatusComponent
  ],
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Оптимизация производительности
})
export class PipelineComponent implements OnInit, OnDestroy {
  // Современный подход с viewChild signal
  pipelineGrid = viewChild<ElementRef<HTMLElement>>('pipelineGrid');
  
  // Signals для состояния
  stages = signal<Stage[]>([]);
  deals = signal<Deal[]>([]);
  activeDropListId = signal<string | null>(null);
  analytics = signal<PipelineAnalytics | null>(null);
  isLoadingAnalytics = signal(false);
  isLoadingData = signal(false);
  
  // Фильтры
  searchQuery = signal('');
  statusFilter = signal<DealStatus | 'all'>('all');
  assignedToFilter = signal<string | 'all'>('all');
  
  // Computed - автоматически пересчитывается при изменении зависимостей
  filteredDeals = computed(() => {
    const allDeals = this.deals();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const assignedTo = this.assignedToFilter();
    
    return allDeals.filter(deal => {
      // Поиск по названию
      if (query && !deal.title.toLowerCase().includes(query)) {
        return false;
      }
      
      // Фильтр по статусу
      if (status !== 'all' && deal.status !== status) {
        return false;
      }
      
      // Фильтр по менеджеру
      if (assignedTo !== 'all' && deal.assignedTo !== assignedTo) {
        return false;
      }
      
      return true;
    });
  });
  
  // Сгруппированные сделки по этапам
  dealsByStage = computed(() => {
    const map: Record<string, Deal[]> = {};
    const stageList = this.stages();
    const filteredDealsList = this.filteredDeals();
    
    // Инициализируем пустые массивы для каждого этапа
    for (const stage of stageList) {
      map[stage.id] = [];
    }
    
    // Группируем сделки
    for (const deal of filteredDealsList) {
      const stageId = deal.stageId || '';
      if (!map[stageId]) map[stageId] = [];
      map[stageId].push(deal);
    }
    
    return map;
  });
  
  // Connected list IDs для CDK Drag & Drop
  connectedListIds = computed(() => {
    return this.stages().map((stage: Stage) => 'stage-' + stage.id);
  });
  
  // Переменные для автоскролла
  private scrollInterval: number | null = null;
  private isDragging = false;
  private mouseX = 0;
  
  // Виртуальный скроллинг - публичные константы для шаблона
  readonly VIRTUAL_SCROLL_ITEM_SIZE = 110; // Уменьшено вдвое со 200px для компактных карточек
  readonly VIRTUAL_SCROLL_THRESHOLD = 50; // Увеличен порог - используем только для очень больших списков
  readonly VIRTUAL_SCROLL_BUFFER = 400; // Буфер в пикселях сверху/снизу для предзагрузки
  
  // Computed для определения использования виртуального скроллинга
  useVirtualScroll = computed(() => {
    const maxDealsInStage = Math.max(
      ...this.stages().map(s => this.getDealsForStage(s.id).length),
      0
    );
    return maxDealsInStage > this.VIRTUAL_SCROLL_THRESHOLD;
  });
  
  private readonly pipelineService = inject(PipelineService);
  private readonly dealsService = inject(DealsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  load() {
    this.isLoadingData.set(true);
    
    // Оптимизация: загружаем все данные параллельно
    forkJoin({
      stages: this.pipelineService.listAllStages(),
      deals: this.dealsService.listDeals(),
      analytics: this.pipelineService.analytics(StageType.DEAL_PROGRESSION)
    }).subscribe({
      next: ({ stages, deals, analytics }) => {
        this.stages.set(stages || []);
        
        const dealsArray = Array.isArray(deals) ? deals : (deals as any).items || [];
        this.deals.set(dealsArray);
        
        this.analytics.set(analytics);
        this.isLoadingData.set(false);
      },
      error: (error) => {
        console.error('Error loading pipeline data:', error);
        this.isLoadingData.set(false);
      }
    });
  }

  getDealsForStage(stageId: string): Deal[] {
    return this.dealsByStage()[stageId] || [];
  }

  getConnectedListIds() {
    return this.connectedListIds();
  }

  triggerAutomation() {
    this.pipelineService.runAutomation().subscribe(() => this.load());
  }

  // Handle drop event when moving a deal to another stage
  dropToStage(event: CdkDragDrop<Deal[]>, targetStageId: string) {
    // Get the deal being moved using cdkDragData
    const movedDeal = event.item.data;
    
    if (event.previousContainer === event.container) {
      // Same container - just reorder
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // Different containers - transfer between stages
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // Update the deal's stageId in the backend
    if (movedDeal && movedDeal.id) {
      // Find the target stage to check its type for optimistic updates
      const targetStage = this.stages().find(s => s.id === targetStageId);
      
      console.log('Moving deal:', movedDeal.title, 'to stage:', targetStage?.name, 'type:', targetStage?.type);
      
      // Optimistic update: predict the new status based on stage type
      this.deals.update(currentDeals => {
        const dealIndex = currentDeals.findIndex(d => d.id === movedDeal.id);
        if (dealIndex !== -1) {
          const updatedDeals = [...currentDeals];
          updatedDeals[dealIndex] = {
            ...updatedDeals[dealIndex],
            stageId: targetStageId
          };
          
          // Optimistically update status if it's a special stage
          if (targetStage?.type === 'won_stage') {
            console.log('Optimistically setting deal status to WON');
            updatedDeals[dealIndex].status = DealStatus.WON;
            updatedDeals[dealIndex].actualCloseDate = new Date();
          } else if (targetStage?.type === 'lost_stage') {
            console.log('Optimistically setting deal status to LOST');
            updatedDeals[dealIndex].status = DealStatus.LOST;
            updatedDeals[dealIndex].actualCloseDate = new Date();
          }
          
          return updatedDeals;
        }
        return currentDeals;
      });

      this.dealsService.moveToStage(movedDeal.id, targetStageId).subscribe({
        next: (updatedDeal) => {
          console.log('Deal updated successfully:', updatedDeal);
          // Update the deal in our local array with the updated deal data from backend
          this.deals.update(currentDeals => {
            const dealIndex = currentDeals.findIndex(d => d.id === movedDeal.id);
            if (dealIndex !== -1) {
              const updatedDeals = [...currentDeals];
              updatedDeals[dealIndex] = updatedDeal;
              console.log('Local deal updated:', updatedDeals[dealIndex]);
              return updatedDeals;
            }
            return currentDeals;
          });
        },
        error: (error) => {
          console.error('Error moving deal:', error);
          // On error, reload to revert changes
          this.load();
        }
      });
    }
  }

  onDropListEntered(event: unknown, stageId: string) {
    this.activeDropListId.set('stage-' + stageId);
    // Auto-scroll to the entered stage
    this.scrollToStage(stageId);
    // Auto-scroll within the stage column if needed
    this.scrollWithinStage(stageId);
  }

  onDropListExited(event: unknown, stageId: string) {
    if (this.activeDropListId() === 'stage-' + stageId) this.activeDropListId.set(null);
  }

  onDragStarted() {
    this.isDragging = true;
    this.setupMouseTracking();
  }

  onDragEnded() {
    this.isDragging = false;
    this.stopAutoScroll();
    this.removeMouseTracking();
  }

  private setupMouseTracking() {
    const handleMouseMove = (event: MouseEvent) => {
      this.mouseX = event.clientX;
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    // Запускаем интервал для автоскролла
    this.startAutoScroll();
    
    // Убираем обработчик при завершении перетаскивания
    setTimeout(() => {
      document.removeEventListener('mousemove', handleMouseMove);
    }, 10000); // Максимум 10 секунд
  }

  private removeMouseTracking() {
    // Очистка обработчиков происходит автоматически в setupMouseTracking
  }

  private checkAutoScroll() {
    if (!this.isDragging) return;
    
    const gridElement = this.pipelineGrid();
    if (!gridElement) return;
    
    const container = gridElement.nativeElement;
    const rect = container.getBoundingClientRect();
    const scrollZoneWidth = 100;
    const scrollSpeed = 8;
    
    // Убираем предыдущие классы
    container.classList.remove('scroll-left', 'scroll-right');
    
    // Автоскролл влево
    if (this.mouseX < rect.left + scrollZoneWidth && container.scrollLeft > 0) {
      container.scrollLeft = Math.max(0, container.scrollLeft - scrollSpeed);
      container.classList.add('scroll-left');
    }
    // Автоскролл вправо
    else if (this.mouseX > rect.right - scrollZoneWidth) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft < maxScroll) {
        container.scrollLeft = Math.min(maxScroll, container.scrollLeft + scrollSpeed);
        container.classList.add('scroll-right');
      }
    }
  }

  private scrollToStage(stageId: string) {
    const gridElement = this.pipelineGrid();
    if (!gridElement) return;
    
    const stageElement = document.getElementById('stage-' + stageId);
    if (!stageElement) return;
    
    const container = gridElement.nativeElement;
    const stageRect = stageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Проверяем, виден ли этап полностью
    const isVisible = stageRect.left >= containerRect.left && 
                     stageRect.right <= containerRect.right;
    
    if (!isVisible) {
      // Вычисляем позицию для прокрутки
      const scrollLeft = stageElement.offsetLeft - container.offsetLeft - 20; // 20px отступ
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }

  private scrollWithinStage(stageId: string) {
    const stageElement = document.getElementById('stage-' + stageId);
    if (!stageElement) return;
    
    const dealsContainer = stageElement.querySelector('.deals') as HTMLElement;
    if (!dealsContainer) return;
    
    // Прокручиваем к середине контейнера для лучшего UX при drop
    const scrollTarget = Math.max(0, (dealsContainer.scrollHeight - dealsContainer.clientHeight) / 2);
    dealsContainer.scrollTo({
      top: scrollTarget,
      behavior: 'smooth'
    });
  }

  private startAutoScroll() {
    this.stopAutoScroll(); // Останавливаем предыдущий интервал
    
    const gridElement = this.pipelineGrid();
    if (!gridElement) return;
    
    const container = gridElement.nativeElement;
    container.classList.add('auto-scrolling');
    
    this.scrollInterval = window.setInterval(() => {
      this.checkAutoScroll();
    }, 50); // Проверяем каждые 50ms
  }

  private stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
    
    const gridElement = this.pipelineGrid();
    if (gridElement) {
      const container = gridElement.nativeElement;
      container.classList.remove('auto-scrolling', 'scroll-left', 'scroll-right');
    }
  }

  createStage() {
  // Navigate to dedicated create-stage page
  this.router.navigate(['/pipeline/create-stage']);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.assignedToFilter.set('all');
  }

  openAnalytics() {
    // Если нет данных аналитики, попробуем загрузить их
    if (!this.analytics()) {
      this.isLoadingAnalytics.set(true);
      this.pipelineService.analytics(StageType.DEAL_PROGRESSION).subscribe({
        next: (analytics) => {
          this.analytics.set(analytics);
          this.isLoadingAnalytics.set(false);
          this.showAnalyticsModal();
        },
        error: () => {
          this.isLoadingAnalytics.set(false);
          this.showAnalyticsModal(); // Показываем модал даже при ошибке
        }
      });
    } else {
      this.showAnalyticsModal();
    }
  }

  private showAnalyticsModal() {
    const dialogRef = this.dialog.open(AnalyticsModalComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { analytics: this.analytics() },
      panelClass: 'analytics-modal-panel',
      disableClose: false,
      autoFocus: true
    });

    // Обработка результата закрытия модального окна
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        // Обновляем данные аналитики
        this.load();
      }
    });
  }

  openAutomationSettings() {
    const dialogRef = this.dialog.open(AutomationSettingsComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'automation-settings-modal',
      disableClose: false,
      autoFocus: true
    });

    // Обработка результата закрытия модального окна
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        // Обновляем данные после изменения настроек автоматизации
        this.load();
      }
    });
  }

  openContactSelector(deal: Deal, event: Event) {
    // Предотвращаем перетаскивание при клике на кнопку
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(DealContactSelectorComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { deal },
      disableClose: false,
      autoFocus: true
    });

    // Обработка результата закрытия модального окна
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Если пришел обновленный deal, обновляем его в массиве
        this.deals.update(currentDeals => {
          const dealIndex = currentDeals.findIndex(d => d.id === deal.id);
          if (dealIndex !== -1) {
            const updatedDeals = [...currentDeals];
            updatedDeals[dealIndex] = result;
            return updatedDeals;
          }
          return currentDeals;
        });
      }
    });
  }

  // Утилиты для работы со статусами сделок
  getDealStatus(deal: Deal): DealStatusType {
    // Конвертируем enum значение в строку для компонента deal-status
    switch (deal.status) {
      case DealStatus.WON:
        return 'won';
      case DealStatus.LOST:
        return 'lost';
      case DealStatus.OPEN:
      default:
        return 'open';
    }
  }

  isOverdue(deal: Deal): boolean {
    const today = new Date();
    const expectedDate = new Date(deal.expectedCloseDate);
    return expectedDate < today && deal.status === 'open';
  }

  isHighValue(deal: Deal): boolean {
    const threshold = 100000; // Порог для крупных сделок
    return deal.amount >= threshold;
  }

  // TrackBy функции для оптимизации виртуального скроллинга
  trackByDealId(index: number, deal: Deal): string | number {
    return deal.id;
  }

  trackByStageId(index: number, stage: Stage): string | number {
    return stage.id;
  }
}
