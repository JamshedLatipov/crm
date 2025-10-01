import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { PipelineService } from './pipeline.service';
import { DealsService } from './deals.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Deal, Stage, PipelineAnalytics, StageType, DealStatus } from './dtos';
import { AnalyticsModalComponent } from './analytics-modal.component';
import { DealContactSelectorComponent } from './deal-contact-selector.component';
import { DealStatusComponent, DealStatus as DealStatusType } from '../shared/components/deal-status/deal-status.component';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatIconModule, MatButtonModule, DealStatusComponent],
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
})
export class PipelineComponent implements OnInit, OnDestroy {
  @ViewChild('pipelineGrid', { static: false }) pipelineGrid!: ElementRef<HTMLElement>;
  
  stages: Stage[] = [];
  deals: Deal[] = [];
  // stable grouped deals by stage id for CDK lists
  dealsByStage: Record<string, Deal[]> = {};
  activeDropListId: string | null = null;
  analytics: PipelineAnalytics | null = null;
  // simple form models
  newStageName = '';
  
  // Переменные для автоскролла
  private scrollInterval: number | null = null;
  private isDragging = false;
  
  // Состояние загрузки
  isLoadingAnalytics = false;
  
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
    // Загружаем все этапы (включая специальные won/lost этапы)
    this.pipelineService.listAllStages().subscribe((stages: Stage[]) => {
      this.stages = stages || [];
      this.rebuildDealsByStage();
    });
    
    // Загружаем сделки
    this.dealsService.listDeals().subscribe((deals: Deal[]) => {
      this.deals = deals || [];
      this.rebuildDealsByStage();
    });
    
    // Загружаем аналитику
    this.pipelineService.analytics(StageType.DEAL_PROGRESSION).subscribe((analytics) => {
      this.analytics = analytics;
    });
  }

  getDealsForStage(stageId: string): Deal[] {
    return this.dealsByStage[stageId] || [];
  }

  getConnectedListIds() {
    return this.stages.map((stage: Stage) => 'stage-' + stage.id);
  }

  triggerAutomation() {
    this.pipelineService.runAutomation().subscribe(() => this.load());
  }

  // rebuild grouped arrays for CDK lists
  rebuildDealsByStage() {
    const map: Record<string, Deal[]> = {};
    for (const stage of this.stages) map[stage.id] = [];
    for (const deal of this.deals) {
      const stageId = deal.stageId || '';
      if (!map[stageId]) map[stageId] = [];
      map[stageId].push(deal);
    }
    this.dealsByStage = map;
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
      const targetStage = this.stages.find(s => s.id === targetStageId);
      
      console.log('Moving deal:', movedDeal.title, 'to stage:', targetStage?.name, 'type:', targetStage?.type);
      
      // Optimistic update: predict the new status based on stage type
      const dealIndex = this.deals.findIndex(d => d.id === movedDeal.id);
      if (dealIndex !== -1) {
        this.deals[dealIndex].stageId = targetStageId;
        
        // Optimistically update status if it's a special stage
        if (targetStage?.type === 'won_stage') {
          console.log('Optimistically setting deal status to WON');
          this.deals[dealIndex].status = DealStatus.WON;
          this.deals[dealIndex].actualCloseDate = new Date();
        } else if (targetStage?.type === 'lost_stage') {
          console.log('Optimistically setting deal status to LOST');
          this.deals[dealIndex].status = DealStatus.LOST;
          this.deals[dealIndex].actualCloseDate = new Date();
        }
        
        this.rebuildDealsByStage();
      }

      this.dealsService.moveToStage(movedDeal.id, targetStageId).subscribe({
        next: (updatedDeal) => {
          console.log('Deal updated successfully:', updatedDeal);
          // Update the deal in our local array with the updated deal data from backend
          const dealIndex = this.deals.findIndex(d => d.id === movedDeal.id);
          if (dealIndex !== -1) {
            this.deals[dealIndex] = updatedDeal; // Replace with updated deal from backend
            console.log('Local deal updated:', this.deals[dealIndex]);
            // Rebuild the grouped deals to reflect the change
            this.rebuildDealsByStage();
          }
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
    this.activeDropListId = 'stage-' + stageId;
    // Auto-scroll to the entered stage
    this.scrollToStage(stageId);
    // Auto-scroll within the stage column if needed
    this.scrollWithinStage(stageId);
  }

  onDropListExited(event: unknown, stageId: string) {
    if (this.activeDropListId === 'stage-' + stageId) this.activeDropListId = null;
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

  private mouseX = 0;

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
    if (!this.isDragging || !this.pipelineGrid) return;
    
    const container = this.pipelineGrid.nativeElement;
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
    if (!this.pipelineGrid) return;
    
    const stageElement = document.getElementById('stage-' + stageId);
    if (!stageElement) return;
    
    const container = this.pipelineGrid.nativeElement;
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
    
    if (!this.pipelineGrid) return;
    
    const container = this.pipelineGrid.nativeElement;
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
    
    if (this.pipelineGrid) {
      const container = this.pipelineGrid.nativeElement;
      container.classList.remove('auto-scrolling', 'scroll-left', 'scroll-right');
    }
  }

  createStage() {
  // Navigate to dedicated create-stage page
  this.router.navigate(['/pipeline/create-stage']);
  }

  openAnalytics() {
    // Если нет данных аналитики, попробуем загрузить их
    if (!this.analytics) {
      this.isLoadingAnalytics = true;
      this.pipelineService.analytics(StageType.DEAL_PROGRESSION).subscribe({
        next: (analytics) => {
          this.analytics = analytics;
          this.isLoadingAnalytics = false;
          this.showAnalyticsModal();
        },
        error: () => {
          this.isLoadingAnalytics = false;
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
      data: { analytics: this.analytics },
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
        const dealIndex = this.deals.findIndex(d => d.id === deal.id);
        if (dealIndex !== -1) {
          this.deals[dealIndex] = result;
          this.rebuildDealsByStage();
        }
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
}
