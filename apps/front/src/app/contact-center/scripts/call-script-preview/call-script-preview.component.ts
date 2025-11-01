import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CallScriptCategory } from '../call-script-category-dialog/call-script-category-dialog.component';
import { CallScriptDialogComponent } from '../call-script-dialog/call-script-dialog.component';

export interface CallScript {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  category?: CallScriptCategory;
  steps: string[];
  questions: string[];
  tips: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-call-script-preview-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatToolbarModule,
    MatDialogModule
  ],
  templateUrl: './call-script-preview.component.html',
  styleUrls: ['./call-script-preview.component.scss']
})
export class CallScriptPreviewPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private apiBase = environment.apiBase;

  script: CallScript | null = null;
  loading = false;
  categories: CallScriptCategory[] = [];

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadCategories();
      this.loadScript(id);
    }
  }

  loadScript(id: string) {
    this.loading = true;
    this.http.get<CallScript>(`${this.apiBase}/call-scripts/${id}`).subscribe({
      next: (script) => {
        this.script = script;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading script:', error);
        this.loading = false;
        this.router.navigate(['/contact-center/scripts']);
      }
    });
  }

  loadCategories() {
    this.http.get<CallScriptCategory[]>(`${this.apiBase}/call-script-categories/active`).subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  onClose() {
    this.router.navigate(['/contact-center/scripts']);
  }

  onEdit() {
    if (this.script) {
      const dialogRef = this.dialog.open(CallScriptDialogComponent, {
        width: '90vw',
        maxWidth: '900px',
        height: '90vh',
        maxHeight: '800px',
        data: {
          script: { ...this.script },
          categories: this.categories,
          isEditMode: true
        }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.updateScript(result);
        }
      });
    }
  }

  onDelete() {
    if (this.script && confirm(`Удалить скрипт "${this.script.title}"?`)) {
      this.http.delete(`${this.apiBase}/call-scripts/${this.script.id}`).subscribe({
        next: () => {
          this.router.navigate(['/contact-center/scripts']);
        },
        error: (error) => {
          console.error('Error deleting script:', error);
        }
      });
    }
  }

  updateScript(script: CallScript) {
    // Create update object with only the fields that exist in the entity
    const updateData: Partial<CallScript> = {
      title: script.title,
      description: script.description,
      categoryId: script.categoryId,
      steps: script.steps,
      questions: script.questions,
      tips: script.tips,
      isActive: script.isActive
    };

    this.http.patch<CallScript>(`${this.apiBase}/call-scripts/${script.id}`, updateData).subscribe({
      next: (updatedScript) => {
        this.script = updatedScript;
      },
      error: (error) => {
        console.error('Error updating script:', error);
      }
    });
  }
}