import { Component, inject, OnInit, signal } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PipelineService } from '../pipeline.service';
import { CreateStageDto, StageType, Stage } from '../dtos';

@Component({
  selector: 'app-create-stage',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './create-stage.component.html',
  styleUrls: ['./create-stage.component.scss']
})
export class CreateStageComponent implements OnInit {
  name = signal('');
  probability = signal(50);
  stageType = signal<StageType>(StageType.DEAL_PROGRESSION);
  stages = signal<Stage[]>([]);

  private readonly pipelineService = inject(PipelineService);
  private readonly router = inject(Router);

  getPlaceholderText(): string {
    switch (this.stageType()) {
      case StageType.WON_STAGE:
        return 'например: Выигрыш, Сделка закрыта';
      case StageType.LOST_STAGE:
        return 'например: Проигрыш, Отклонено';
      default:
        return 'например: Предложение отправлено';
    }
  }

  create() {
    if (!this.name()) return;
    const dto: CreateStageDto = {
      name: this.name(),
      type: this.stageType(),
      position: 0,
      probability: this.stageType() === StageType.DEAL_PROGRESSION ? (this.probability() || 50) :
                  this.stageType() === StageType.WON_STAGE ? 100 : 0,
    };
    this.pipelineService.createStage(dto).subscribe(() => {
      this.load();
      this.name.set('');
      this.stageType.set(StageType.DEAL_PROGRESSION);
      this.probability.set(50);
    });
  }

  cancel() {
    this.router.navigate(['/pipeline']);
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.pipelineService.listAllStages().subscribe((s: Stage[]) => {
      this.stages.set(s || []);
    });
  }

  onReorder(event: CdkDragDrop<Stage[]>) {
    const currentStages = this.stages();
    moveItemInArray(currentStages, event.previousIndex, event.currentIndex);
    this.stages.set([...currentStages]);

    const stageIds = currentStages.map(s => s.id);
    this.pipelineService.reorderStages(stageIds).subscribe({
      next: () => {},
      error: () => {
        this.load();
      }
    });
  }
}