import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
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
    ReactiveFormsModule,
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
  private data = inject(MAT_DIALOG_DATA) as { script?: CallScript; categories?: CallScriptCategory[]; isEditMode?: boolean; parentScript?: CallScript };
  private apiBase = environment.apiBase;
  private fb = inject(FormBuilder);

  form: FormGroup;
  categories = signal<CallScriptCategory[]>([]);
  availableScripts = signal<CallScript[]>([]);
  hierarchicalScripts = signal<CallScriptWithDepth[]>([]);
  isEditMode = false;
  parentScript?: CallScript;

  constructor() {
    // Initialize an empty form to avoid template errors before ngOnInit logic
    this.form = this.fb.group({
      id: [null],
      title: ['', Validators.required],
      categoryId: [null, Validators.required],
      parentId: [null],
      description: [''],
      isActive: [true],
      steps: this.fb.array([]),
      questions: this.fb.array([]),
      tips: this.fb.array([])
    });
  }

  ngOnInit() {
    console.log('Dialog initialized with data:', this.data);
    const incoming = this.data || {};

    this.categories.set(incoming.categories || []);
    this.isEditMode = !!incoming.isEditMode;
    this.parentScript = incoming.parentScript;

    const script = incoming.script || {} as Partial<CallScript>;

    // If creating a child script, ensure parentId is set
    if (this.parentScript && !this.isEditMode) {
      script.parentId = this.parentScript.id;
      console.log('Setting parentId for child script:', script.parentId);
    }

    // Patch form values
    this.form.patchValue({
      id: script.id || null,
      title: script.title || '',
      categoryId: script.categoryId || null,
      parentId: script.parentId || null,
      description: script.description || '',
      isActive: script.isActive ?? true
    });

    // Populate arrays
    const steps = Array.isArray(script.steps) ? script.steps : [];
    const questions = Array.isArray(script.questions) ? script.questions : [];
    const tips = Array.isArray(script.tips) ? script.tips : [];

    steps.forEach(s => this.addStep(s));
    questions.forEach(q => this.addQuestion(q));
    tips.forEach(t => this.addTip(t));

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
        const currentId = this.form.value?.id;
        if (this.isEditMode && currentId) {
          available = available.filter(s => s.id !== currentId);
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

  // Reactive form helpers for arrays
  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  stepsControls() {
    return this.steps.controls;
  }

  addStep(value: string = '') {
    this.steps.push(this.fb.control(value));
  }

  removeStep(index: number) {
    this.steps.removeAt(index);
  }

  get questions(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  questionsControls() {
    return this.questions.controls;
  }

  addQuestion(value: string = '') {
    this.questions.push(this.fb.control(value));
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  get tips(): FormArray {
    return this.form.get('tips') as FormArray;
  }

  tipsControls() {
    return this.tips.controls;
  }

  addTip(value: string = '') {
    this.tips.push(this.fb.control(value));
  }

  removeTip(index: number) {
    this.tips.removeAt(index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onSave() {
    if (this.form.invalid) return;

    const raw = this.form.value;
    const scriptData = {
      ...raw,
      parentId: raw.parentId && raw.parentId !== '' ? raw.parentId : null,
      steps: this.parseMultilineText(raw.steps || []),
      questions: this.parseMultilineText(raw.questions || []),
      tips: this.parseMultilineText(raw.tips || [])
    } as Partial<CallScript>;

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