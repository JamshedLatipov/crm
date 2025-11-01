import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CallScript, CallScriptCategory } from '../../../shared/interfaces/call-script.interface';

interface CallScriptWithDepth extends CallScript {
  depth?: number;
}

@Component({
  selector: 'app-call-script-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './call-script-dialog.component.html',
  styleUrls: ['./call-script-dialog.component.scss']
})
export class CallScriptDialogComponent {
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<CallScriptDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);
  private apiBase = environment.apiBase;

  script: Partial<CallScript> = {};
  categories = signal<CallScriptCategory[]>([]);
  availableScripts = signal<CallScript[]>([]);
  hierarchicalScripts = signal<CallScriptWithDepth[]>([]);
  isEditMode = false;
  parentScript?: CallScript;

  ngOnInit() {
    console.log('Dialog initialized with data:', this.data);
    
    this.script = { ...this.data.script };
    this.categories.set(this.data.categories || []);
    this.isEditMode = this.data.isEditMode || false;
    this.parentScript = this.data.parentScript;

    // If creating a child script, ensure parentId is set
    if (this.parentScript && !this.isEditMode) {
      this.script.parentId = this.parentScript.id;
      console.log('Setting parentId for child script:', this.script.parentId);
    }

    // Initialize arrays if not present
    if (!this.script.steps) this.script.steps = [];
    if (!this.script.questions) this.script.questions = [];
    if (!this.script.tips) this.script.tips = [];

    // Log current parentId for debugging
    console.log('Current script parentId:', this.script.parentId);

    // Load available scripts for parent selection (exclude current script and its descendants)
    this.loadAvailableScripts();
  }

  private loadAvailableScripts() {
    const url = `${this.apiBase}/call-scripts`;
    console.log('Loading available scripts from:', url);
    
    this.http.get<CallScript[]>(url).subscribe({
      next: (scripts) => {
        console.log('Loaded scripts:', scripts.length);
        
        // Filter out current script and its descendants to prevent circular references
        let available = scripts;
        if (this.isEditMode && this.script.id) {
          available = available.filter(s => s.id !== this.script.id);
          console.log('Filtered out current script, available:', available.length);
        }
        
        this.availableScripts.set(available);
        
        // Build hierarchical structure
        const hierarchical = this.buildHierarchicalList(available);
        this.hierarchicalScripts.set(hierarchical);
        
        console.log('Hierarchical scripts built:', hierarchical.length);
      },
      error: (error) => {
        console.error('Error loading available scripts:', error);
      }
    });
  }

  private buildHierarchicalList(scripts: CallScript[]): CallScriptWithDepth[] {
    // Create a map for quick lookup
    const scriptMap = new Map<string, CallScript>();
    scripts.forEach(script => scriptMap.set(script.id, script));

    // Find root scripts (no parent)
    const roots = scripts.filter(s => !s.parentId);
    
    // Recursively build flat list with depth info
    const result: CallScriptWithDepth[] = [];
    
    const addScriptWithChildren = (script: CallScript, depth: number = 0) => {
      // Add depth property for rendering
      const scriptWithDepth: CallScriptWithDepth = { ...script, depth };
      result.push(scriptWithDepth);
      
      // Find and add children
      const children = scripts.filter(s => s.parentId === script.id);
      children.forEach(child => addScriptWithChildren(child, depth + 1));
    };

    // Build the list starting from roots
    roots.forEach(root => addScriptWithChildren(root));
    
    return result;
  }

  getScriptIndent(script: CallScriptWithDepth): string {
    const depth = script.depth || 0;
    return '—'.repeat(depth) + (depth > 0 ? ' ' : '');
  }

  addStep() {
    this.script.steps = [...(this.script.steps || []), ''];
  }

  removeStep(index: number) {
    this.script.steps = (this.script.steps || []).filter((_, i) => i !== index);
  }

  addQuestion() {
    this.script.questions = [...(this.script.questions || []), ''];
  }

  removeQuestion(index: number) {
    this.script.questions = (this.script.questions || []).filter((_, i) => i !== index);
  }

  addTip() {
    this.script.tips = [...(this.script.tips || []), ''];
  }

  removeTip(index: number) {
    this.script.tips = (this.script.tips || []).filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onSave() {
    if (!this.script.title?.trim() || !this.script.categoryId) return;

    const scriptData = {
      ...this.script,
      parentId: this.script.parentId && this.script.parentId !== '' ? this.script.parentId : null, // Convert empty string to null
      steps: this.parseMultilineText(this.script.steps as string[]),
      questions: this.parseMultilineText(this.script.questions as string[]),
      tips: this.parseMultilineText(this.script.tips as string[])
    };

    console.log('Saving script data:', scriptData);
    this.dialogRef.close(scriptData);
  }

  onCancel() {
    this.dialogRef.close();
  }

  private parseMultilineText(textArray: string[]): string[] {
    if (!Array.isArray(textArray)) return [];
    return textArray.filter(item => item && item.trim());
  }
}