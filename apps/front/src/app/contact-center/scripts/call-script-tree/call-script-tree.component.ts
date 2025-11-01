import { Component, Input, Output, EventEmitter, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatDividerModule } from '@angular/material/divider';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Router } from '@angular/router';
import { CallScriptTree, CallScript } from '../../../shared/interfaces/call-script.interface';

@Component({
  selector: 'app-call-script-tree',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTreeModule,
    MatDividerModule
  ],
  templateUrl: './call-script-tree.component.html',
  styleUrls: ['./call-script-tree.component.scss']
})
export class CallScriptTreeComponent implements OnChanges {
  private router = inject(Router);

  @Input() scripts: CallScriptTree[] = [];
  @Input() loading = false;

  @Output() createChild = new EventEmitter<CallScript>();
  @Output() edit = new EventEmitter<CallScript>();
  @Output() delete = new EventEmitter<CallScript>();
  @Output() view = new EventEmitter<CallScript>();

  // MatTree setup
  treeControl = new NestedTreeControl<CallScriptTree>((node: any) => node.children || []);
  dataSource = new MatTreeNestedDataSource<CallScriptTree>();

  ngOnChanges() {
    // Ensure all nodes have children array
    const normalizedScripts = this.scripts.map(script => ({
      ...script,
      children: script.children || []
    }));
    this.dataSource.data = normalizedScripts;
  }

  hasChild = (_: number, node: CallScriptTree) => !!node.children && node.children.length > 0;

  getNodeIcon(node: CallScriptTree): string {
    if (node.children && node.children.length > 0) {
      return 'folder';
    }
    return 'description';
  }

  onCreateChild(node: CallScriptTree) {
    this.createChild.emit(node);
  }

  onEdit(node: CallScriptTree) {
    this.edit.emit(node);
  }

  onDelete(node: CallScriptTree) {
    this.delete.emit(node);
  }

  onView(node: CallScriptTree) {
    this.view.emit(node);
  }

  onToggle(node: CallScriptTree) {
    this.treeControl.toggle(node);
  }
}