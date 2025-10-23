import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { CommentsService } from '../../services/comments.service';
import { AuthService } from '../../../auth/auth.service';
import {
  Comment,
  CommentEntityType,
  CreateCommentRequest,
  PaginatedComments
} from '../../interfaces/comment.interface';

interface CommentGroup {
  userName: string;
  comments: Comment[];
}

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatPaginatorModule,
    ReactiveFormsModule
  ],
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class CommentsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) entityType!: CommentEntityType;
  @Input({ required: true }) entityId!: string;
  @Output() commentCountChange = new EventEmitter<number>();

  private readonly commentsService = inject(CommentsService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private subscription = new Subscription();

  // Состояние
  commentsData = signal<PaginatedComments | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  editingComment = signal<Comment | null>(null);
  newCommentText = new FormControl('', [Validators.required, Validators.maxLength(2000)]);


  // Форма
  currentPage = 1;
  pageSize = 20;

  // Computed свойства
  comments = computed(() => this.commentsData()?.items || []);
  commentGroups = computed(() => {
    const comments = this.comments();
    const groups: CommentGroup[] = [];
    
    for (const comment of comments) {
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && lastGroup.userName === comment.userName) {
        // Добавляем к существующей группе
        lastGroup.comments.push(comment);
      } else {
        // Создаем новую группу
        groups.push({
          userName: comment.userName,
          comments: [comment]
        });
      }
    }
    
    return groups;
  });
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  canSubmit = computed(() => {
      return this.newCommentText.invalid;
  });

  ngOnInit() {
    this.loadComments();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackByCommentId(index: number, comment: Comment): string {
    return comment.id;
  }

  trackByGroupUser(index: number, group: CommentGroup): string {
    return group.userName;
  }

  loadComments() {
    this.isLoading.set(true);
    
    const sub = this.commentsService
      .getCommentsForEntity(this.entityType, this.entityId, this.currentPage, this.pageSize)
      .subscribe({
        next: (data) => {
          this.commentsData.set(data);
          this.commentCountChange.emit(data.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Ошибка загрузки комментариев:', error);
          this.snackBar.open('Ошибка загрузки комментариев', 'Закрыть', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isLoading.set(false);
        }
      });

    this.subscription.add(sub);
  }

  addComment() {
    if (!this.canSubmit()) return;

    // Если редактируем существующий комментарий
    if (this.editingComment()) {
      this.updateComment();
      return;
    }

    this.isSubmitting.set(true);

    const request: CreateCommentRequest = {
      text: this.newCommentText.value || '',
      entityType: this.entityType,
      entityId: this.entityId
    };

    const sub = this.commentsService.createComment(request).subscribe({
      next: () => {
        this.newCommentText.setValue('');
        this.isSubmitting.set(false);
        this.snackBar.open('Комментарий добавлен', 'Закрыть', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        this.loadComments(); // Перезагружаем комментарии
      },
      error: (error) => {
        console.error('Ошибка добавления комментария:', error);
        this.snackBar.open('Ошибка добавления комментария', 'Закрыть', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isSubmitting.set(false);
      }
    });

    this.subscription.add(sub);
  }

  startEdit(comment: Comment) {
    this.editingComment.set(comment);
    this.newCommentText.setValue(comment.text);
  }

  cancelEdit() {
    this.editingComment.set(null);
    this.newCommentText.setValue('');
  }

  updateComment() {
    const comment = this.editingComment();
    if (!comment || !this.canSubmit()) return;

    this.isSubmitting.set(true);

    const sub = this.commentsService
      .updateComment(comment.id, { text: this.newCommentText.value || '' })
      .subscribe({
        next: () => {
          this.editingComment.set(null);
          this.newCommentText.setValue('');
          this.isSubmitting.set(false);
          this.snackBar.open('Комментарий обновлен', 'Закрыть', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });
          this.loadComments();
        },
        error: (error) => {
          console.error('Ошибка обновления комментария:', error);
          this.snackBar.open('Ошибка обновления комментария', 'Закрыть', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isSubmitting.set(false);
        }
      });

    this.subscription.add(sub);
  }

  deleteComment(comment: Comment) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }

    const sub = this.commentsService.deleteComment(comment.id).subscribe({
      next: () => {
        this.snackBar.open('Комментарий удален', 'Закрыть', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        this.loadComments();
      },
      error: (error) => {
        console.error('Ошибка удаления комментария:', error);
        this.snackBar.open('Ошибка удаления комментария', 'Закрыть', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });

    this.subscription.add(sub);
  }

  canEditComment(comment: Comment): boolean {
    return this.authService.user() === comment.userName;
  }

  canEditGroup(group: CommentGroup): boolean {
    return this.authService.user() === group.userName;
  }

  startEditGroup(group: CommentGroup) {
    // Пока просто редактируем первое сообщение группы
    if (group.comments.length > 0) {
      this.startEdit(group.comments[0]);
    }
  }

  deleteGroup(group: CommentGroup) {
    if (!confirm(`Вы уверены, что хотите удалить все ${group.comments.length} сообщений пользователя ${group.userName}?`)) {
      return;
    }

    // Удаляем все комментарии группы
    const deletePromises = group.comments.map(comment => 
      this.commentsService.deleteComment(comment.id).toPromise()
    );

    Promise.all(deletePromises).then(() => {
      this.snackBar.open('Сообщения удалены', 'Закрыть', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
      this.loadComments();
    }).catch((error) => {
      console.error('Ошибка удаления сообщений:', error);
      this.snackBar.open('Ошибка удаления сообщений', 'Закрыть', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadComments();
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Сегодня в ' + date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Вчера в ' + date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      return `${diffDays} дня назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}