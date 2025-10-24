import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { HumanDatePipe } from '../../../../shared/pipes/human-date.pipe';
import { User } from '../../../../users/users.service';
import { TaskHistory } from '../../../tasks.service';

type ID = string | number;

@Component({
    selector: 'crm-task-history',
    standalone: true,
    imports: [CommonModule, MatProgressSpinnerModule, MatIconModule, MatDividerModule, HumanDatePipe],
    templateUrl: './task-history.component.html',
    styleUrls: ['./task-history.component.scss']
})
export class TaskHistoryComponent {
    /**
     * Inputs - component is presentational (dumb). Parent/smart component
     * is responsible for loading/updating the history data.
     */
    @Input() taskId?: ID;
    @Input() initialHistory: TaskHistory[] | null = [];
    @Input() history: TaskHistory[] = [];
    @Input() managers: User[] = [];
    @Input() loading = false;
    @Input() page = 1;
    @Input() pageSize = 20;
    @Input() hasMore = false;

    /**
     * Outputs - notify parent when user requests actions. Parent should
     * perform HTTP calls and update inputs accordingly.
     */
    @Output() restored = new EventEmitter<ID>();
    @Output() deleted = new EventEmitter<ID>();
    @Output() loadNext = new EventEmitter<void>();
    @Output() requestLoad = new EventEmitter<{ page?: number; pageSize?: number; append?: boolean }>();

    // Presentational helpers
    formatDate(iso?: string): string {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(d);
        } catch {
            return iso;
        }
    }

    openAttachment(attachment: { url: string; name?: string }): void {
        if (!attachment?.url) return;
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }

    // Emitters used by template actions
    emitLoadNext(): void {
        this.loadNext.emit();
    }

    emitRequestLoad(opts?: { page?: number; pageSize?: number; append?: boolean }): void {
        this.requestLoad.emit(opts ?? {});
    }

    emitRestore(item: TaskHistory): void {
        this.restored.emit(item.id);
    }

    emitDelete(item: TaskHistory): void {
        this.deleted.emit(item.id);
    }

    trackByHistoryId(_idx: number, item: TaskHistory): ID {
        return item.id;
    }

    // --- Template-facing helpers (copied/adapted from TaskDetailComponent) ---
    isLoadingHistory(): boolean {
        return !!this.loading;
    }

    taskHistory(): TaskHistory[] {
        return this.history || this.initialHistory || [];
    }

    getHistoryIcon(action: string): string {
        const icons: Record<string, string> = {
            created: 'add_circle_outline',
            updated: 'edit_note',
            status_changed: 'swap_horizontal_circle',
            deleted: 'delete_outline',
        };
        return icons[action] || 'info_outline';
    }

    getHistoryIconClass(action: string): string {
        const classes: Record<string, string> = {
            created: 'created',
            updated: 'updated',
            status_changed: 'status-changed',
            deleted: 'deleted',
        };
        return classes[action] || 'default';
    }

    getHistoryCardClass(action: string): string {
        const classes: Record<string, string> = {
            created: 'card-created',
            updated: 'card-updated',
            status_changed: 'card-status-changed',
            deleted: 'card-deleted',
        };
        return classes[action] || 'card-default';
    }

    getHistoryActionText(item: TaskHistory): string {
        const actions: Record<string, string> = {
            created: 'Задача создана',
            updated: 'Задача обновлена',
            status_changed: 'Статус изменён',
            deleted: 'Задача удалена',
        };
        // If item.meta or item.type contains more specific info, template can use it
        return actions[(item as any).action] || 'action';
    }

    getDetailKeys(details: any): string[] {
        return Object.keys(details || {});
    }

    getChangeTypeClass(change: any): string {
        if (!change) return 'change-unknown';
        if (change.old !== undefined && change.new !== undefined)
            return 'change-modified';
        if (change.old !== undefined && change.new === undefined)
            return 'change-removed';
        if (change.old === undefined && change.new !== undefined)
            return 'change-added';
        return 'change-unknown';
    }

    getFieldDisplayName(key: string): string {
        const names: Record<string, string> = {
            title: 'Название',
            description: 'Описание',
            status: 'Статус',
            dueDate: 'Срок выполнения',
            assignedTo: 'Исполнитель',
            assignedToId: 'Исполнитель',
            leadId: 'Лид ID',
            dealId: 'Сделка ID',
            taskTypeId: 'Тип задачи ID',
        };
        return names[key] || key;
    }

    formatValue(value: any): string {
        if (value === null || value === undefined) return 'не указано';
        if (typeof value === 'boolean') return value ? 'да' : 'нет';

        if (typeof value === 'string') {
            const statusLabels: Record<string, string> = {
                pending: 'В ожидании',
                in_progress: 'В работе',
                done: 'Завершено',
                overdue: 'Просрочено',
            };
            if (statusLabels[value]) {
                return statusLabels[value];
            }
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                return new Date(value).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }
        }

        if (typeof value === 'number') return String(value);

        if (typeof value === 'object') return JSON.stringify(value, null, 2);

        return String(value);
    }

    /**
     * Return user initials for avatar dot (e.g. "ИВ" for Иван Васильев).
     */
    getUserInitials(user?: User): string {
        if (!user) return '';
        const fn = (user.name?.split(' ')[0] || '').trim();
        const ln = (user.name?.split(' ')[1] || '').trim();
        if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
        if (fn) return fn.slice(0, 2).toUpperCase();
        if (ln) return ln.slice(0, 2).toUpperCase();
        return '';
    }

    /**
     * Find user by id in provided managers input and return full name or id as fallback
     */
    getUserNameById(id: string | number | undefined): string {
        if (id === null || id === undefined || id === '') return 'не указано';
        const found = (this.managers || []).find(m => String(m.id) === String(id));
    if (found) return found.name || String(found.id);
        return String(id);
    }

    getUserDisplay(value: unknown): string {
        if (value === null || value === undefined || value === '') return 'не указано';
        if (typeof value === 'object') {
            const v = value as Record<string, unknown>;
            const fn = (v['firstName'] || v['first_name'] || '') as string;
            const ln = (v['lastName'] || v['last_name'] || '') as string;
            const name = ((v['name'] as string) || '').trim();
            const full = (name || (fn + ' ' + ln).trim()).trim();
            return full || JSON.stringify(v);
        }
        // primitive (id)
        return this.getUserNameById(value as string | number);
    }
}