import { Component, inject, OnInit } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PipelineService } from './pipeline.service';
import { CreateStageDto, StageType, Stage } from './dtos';

@Component({
  selector: 'app-create-stage',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
  <div class="p-6 bg-white text-black rounded-lg">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Stages</h1>
        <p class="text-sm text-gray-600">Manage stages for the sales pipeline. Click a stage to edit.</p>
      </div>
      <button (click)="cancel()" class="text-sm text-gray-600 hover:text-black">Back to Pipeline</button>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <!-- Left: stages list -->
      <div class="col-span-1 bg-white p-4 rounded-lg border border-gray-200">
        <h3 class="font-semibold mb-3">Existing stages</h3>
        <div cdkDropList class="space-y-2" (cdkDropListDropped)="onReorder($event)">
          <div *ngFor="let s of stages" cdkDrag class="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 bg-white">
            <div>
              <div class="text-sm font-medium">{{ s.name }}</div>
              <div class="text-xs text-gray-500">Prob: {{ s.probability }}% • {{ s.isActive ? 'Active' : 'Disabled' }}</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="text-gray-500 hover:text-black">edit</button>
              <button class="text-gray-500 hover:text-black">delete</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: create form spanning two columns -->
      <div class="col-span-2 bg-white p-6 rounded-lg border border-gray-200">
        <h3 class="font-semibold mb-4">Create new stage</h3>
        <div class="space-y-4">
          <label class="flex flex-col">
            <span class="text-sm font-medium pb-2">Stage Name</span>
            <input [(ngModel)]="name" placeholder="e.g. Proposal Sent" class="form-input rounded-lg px-3 py-2 border border-gray-200 focus:border-[var(--primary-color)] bg-white text-black" />
          </label>

          <label class="flex flex-col">
            <span class="text-sm font-medium pb-2">Probability (%)</span>
            <input type="number" [(ngModel)]="probability" min="0" max="100" class="form-input rounded-lg px-3 py-2 border border-gray-200 bg-white text-black" />
          </label>

          <div class="flex items-center justify-end gap-3 pt-4">
            <button (click)="cancel()" class="px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-200">Cancel</button>
            <button (click)="create()" [disabled]="!name" class="px-4 py-2 rounded-lg bg-[var(--primary-color)] text-black font-bold">Create Stage</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class CreateStageComponent implements OnInit {
  name = '';
  probability = 50;
  stages: Stage[] = [];

  private readonly pipelineService = inject(PipelineService);
  private readonly router = inject(Router);

  create() {
    if (!this.name) return;
    const dto: CreateStageDto = {
      name: this.name,
      type: StageType.DEAL_PROGRESSION,
      position: 0,
      probability: this.probability || 50,
    };
    this.pipelineService.createStage(dto).subscribe(() => {
      // after create navigate back to pipeline
  this.load();
  this.name = '';
  this.probability = 50;
    });
  }

  cancel() {
    this.router.navigate(['/pipeline']);
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.pipelineService.listStages(StageType.DEAL_PROGRESSION).subscribe((s) => {
      this.stages = s || [];
    });
  }

  onReorder(event: CdkDragDrop<Stage[]>) {
    // Optimistic UI update
    moveItemInArray(this.stages, event.previousIndex, event.currentIndex);

    // Persist new order (send array of ids in the new order)
    const stageIds = this.stages.map(s => s.id);
    this.pipelineService.reorderStages(stageIds).subscribe({
      next: () => {
        // success - nothing to do, UI already updated
      },
      error: () => {
        // on error, reload to revert
        this.load();
      }
    });
  }
}
