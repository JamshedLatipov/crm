import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { PipelineService } from './pipeline.service';
import { DealsService } from './deals.service';
import { Deal, Stage, PipelineAnalytics, StageType, CreateStageDto } from './dtos';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
})
export class PipelineComponent implements OnInit {
  stages: Stage[] = [];
  deals: Deal[] = [];
  // stable grouped deals by stage id for CDK lists
  dealsByStage: Record<string, Deal[]> = {};
  activeDropListId: string | null = null;
  analytics: PipelineAnalytics | null = null;
  // simple form models
  newStageName = '';
  
  private readonly pipelineService = inject(PipelineService);
  private readonly dealsService = inject(DealsService);

  ngOnInit(): void {
    this.load();
  }

  load() {
    // Загружаем этапы для сделок
    this.pipelineService.listStages(StageType.DEAL_PROGRESSION).subscribe((stages: Stage[]) => {
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
      this.dealsService.moveToStage(movedDeal.id, targetStageId).subscribe({
        next: () => {
          // Update the deal in our local array as well
          const dealIndex = this.deals.findIndex(d => d.id === movedDeal.id);
          if (dealIndex !== -1) {
            this.deals[dealIndex].stageId = targetStageId;
            // Rebuild the grouped deals to reflect the change
            this.rebuildDealsByStage();
          }
        },
        error: () => {
          // On error, reload to revert changes
          this.load();
        }
      });
    }
  }

  onDropListEntered(event: unknown, stageId: string) {
    this.activeDropListId = 'stage-' + stageId;
  }

  onDropListExited(event: unknown, stageId: string) {
    if (this.activeDropListId === 'stage-' + stageId) this.activeDropListId = null;
  }

  createStage() {
    if (!this.newStageName) return;
    
    const dto: CreateStageDto = {
      name: this.newStageName,
      type: StageType.DEAL_PROGRESSION,
      position: this.stages.length,
      probability: 50 // Default probability
    };
    
    this.pipelineService.createStage(dto).subscribe(() => {
      this.newStageName = '';
      this.load();
    });
  }
}
