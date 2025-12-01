import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { UserManagementService, User } from '../../../services/user-management.service';
import { AssignmentService } from '../../../services/assignment.service';
import { LeadService } from '../../../leads/services/lead.service';
import { DealsService } from '../../../pipeline/deals.service';
import { TasksService } from '../../../tasks/tasks.service';
import { ReferenceDataService } from '../../../services/reference-data.service';
import { PasswordResetSnackbarComponent } from '../../../shared/components/password-reset-snackbar/password-reset-snackbar.component';
import { UserHeaderComponent } from '../components/user-header/user-header.component';
import { UserRolesComponent } from '../components/user-roles/user-roles.component';
import { UserTerritoriesComponent } from '../components/user-territories/user-territories.component';
import { UserSkillsComponent } from '../components/user-skills/user-skills.component';
import { UserActivityComponent } from '../components/user-activity/user-activity.component';
import { roleDisplay, getUserStatusBadgeClass } from '../../../shared/utils';

type TabType = 'overview' | 'performance' | 'activity';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    UserHeaderComponent,
    UserRolesComponent,
    UserTerritoriesComponent,
    UserSkillsComponent,
    UserActivityComponent,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    MatTabsModule,
  MatListModule,
    MatDividerModule
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetailComponent implements OnInit {
  protected readonly userService = inject(UserManagementService);
  protected readonly assignmentService = inject(AssignmentService);
  protected readonly leadService = inject(LeadService);
  protected readonly dealsService = inject(DealsService);
  protected readonly tasksService = inject(TasksService);
  protected readonly referenceDataService = inject(ReferenceDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Component state
  public readonly currentUser = signal<User | null>(null);
  public readonly managerInfo = signal<User | null>(null);
  // Role input for inline add
  public readonly roleInput = signal<string>('');

  // Territory input for inline add
  public readonly territoryInput = signal<string>('');

  // Available roles from reference data (id + name)
  public readonly availableRoles = this.referenceDataService.activeRoles;

  // Options suitable for ChipAutocompleteComponent
  public readonly rolesOptions = computed(() => this.availableRoles().map(r => ({ id: r.id, name: r.name })));

  // Filtered roles for autocomplete (exclude roles already assigned to current user)
  public readonly filteredRoles = computed(() => {
    const user = this.currentUser();
    const assigned = user?.roles || [];
    return this.availableRoles().filter(r => !assigned.includes(r.id));
  });

  // Whether the inline role selector (autocomplete input) is visible
  public readonly showRoleSelector = signal<boolean>(false);

  // Available territories from reference data
  public readonly availableTerritories = this.referenceDataService.activeTerritories;

  public readonly territoriesOptions = computed(() => this.availableTerritories().map(t => ({ id: t.id, name: t.name })));

  // Filtered territories for autocomplete (exclude territories already assigned to current user)
  public readonly filteredTerritories = computed(() => {
    const user = this.currentUser();
    const assigned = user?.territories || [];
    return this.availableTerritories().filter(t => !assigned.includes(t.id));
  });

  // Whether the inline territory selector is visible
  public readonly showTerritorySelector = signal<boolean>(false);

  // Skill input for inline add
  public readonly skillInput = signal<string>('');

  // Available skills from reference data
  public readonly availableSkills = this.referenceDataService.activeSkills;

  public readonly skillsOptions = computed(() => this.availableSkills().map(s => ({ id: s.id, name: s.name })));

  // Filtered skills for autocomplete (exclude skills already assigned to current user)
  public readonly filteredSkills = computed(() => {
    const user = this.currentUser();
    const assigned = user?.skills || [];
    return this.availableSkills().filter(s => !assigned.includes(s.id));
  });

  // Whether the inline skill selector is visible
  public readonly showSkillSelector = signal<boolean>(false);

  // Assigned entities
  public readonly assignedLeads = signal<any[]>([]);
  public readonly assignedDeals = signal<any[]>([]);
  public readonly assignedTasks = signal<any[]>([]);
  public readonly assignedLoading = signal<boolean>(false);
  // Performance analytics
  public readonly performanceLoading = signal<boolean>(false);
  public readonly performanceStats = signal<any | null>(null);

  openSkillSelector(): void {
    this.showSkillSelector.set(true);
    setTimeout(() => {
      const el = document.getElementById('skill-input-el') as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }

  openTerritorySelector(): void {
    this.showTerritorySelector.set(true);
    setTimeout(() => {
      const el = document.getElementById('territory-input-el') as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }

  openRoleSelector(): void {
    this.showRoleSelector.set(true);
    // focus the input after it's rendered
    setTimeout(() => {
      const el = document.getElementById('role-input-el') as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }

  private readonly roleLabels: Record<string, string> = {
    'admin': 'Администратор',
    'sales_manager': 'Менеджер продаж',
    'senior_manager': 'Старший менеджер',
    'team_lead': 'Руководитель команды',
    'account_manager': 'Менеджер аккаунтов',
    'client': 'Клиент'
  };

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(parseInt(userId));
    } else {
      this.goBack();
    }
  }

  // User actions
  editUser(): void {
    const userId = this.currentUser()?.id;
    if (userId) {
      this.router.navigate(['/users', userId, 'edit']);
    }
  }

  toggleUserStatus(): void {
    const user = this.currentUser();
    if (!user) return;

    const newStatus = !user.isActive;
    this.userService.updateUser(user.id, { isActive: newStatus }).subscribe({
      next: (updatedUser) => {
        this.currentUser.set(updatedUser);
        this.showSuccess(
          newStatus ? 'Пользователь активирован' : 'Пользователь деактивирован'
        );
      },
      error: () => {
        this.showError('Ошибка при изменении статуса пользователя');
      }
    });
  }

  resetPassword(): void {
    const user = this.currentUser();
    if (!user) return;

    this.userService.resetPassword(user.id).subscribe({
      next: (result) => {
        this.snackBar.openFromComponent(PasswordResetSnackbarComponent, {
          data: { password: result.temporaryPassword },
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: () => {
        this.showError('Ошибка при сбросе пароля');
      }
    });
  }

  deleteUser(): void {
    const user = this.currentUser();
    if (!user) return;

    if (confirm(`Вы уверены, что хотите удалить пользователя ${user.firstName} ${user.lastName}?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showSuccess('Пользователь удален');
          this.goBack();
        },
        error: () => {
          this.showError('Ошибка при удалении пользователя');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  goToDeal(dealId: string | number): void {
    if (!dealId) return;
    this.router.navigate(['/deals', 'view', String(dealId)]);
  }

  goToTask(taskId: number): void {
    if (!taskId) return;
    this.router.navigate(['/tasks', 'view', taskId]);
  }

  goToLead(leadId: number): void {
    if (!leadId) return;
    this.router.navigate(['/leads', 'view', leadId]);
  }

  // For avatars/initials in assignment lists — try title/name, fallback to id
  getEntityInitials(entity: any): string {
    if (!entity) return '?';
    const text = (entity.title || entity.name || String(entity.id || '')).toString().trim();
    if (!text) return '?';
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Utility methods
  getInitials(user: User): string {
    const firstInitial = user.firstName?.charAt(0).toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial || user.username?.charAt(0).toUpperCase() || '?';
  }

  getStatusBadgeClass(user: User): string {
    return getUserStatusBadgeClass(user.isActive);
  }

  getRoleLabel(role: string): string {
    return roleDisplay(role);
  }

  // Map display name -> id (if user selects by name from autocomplete)
  private findRoleIdByName(name: string): string | undefined {
    const found = this.referenceDataService.roles().find(r => r.name === name || r.id === name);
    return found?.id;
  }

  // Map territory name -> id
  private findTerritoryIdByName(name: string): string | undefined {
    const found = this.referenceDataService.territories().find(t => t.name === name || t.id === name);
    return found?.id;
  }

  // Map skill name -> id
  private findSkillIdByName(name: string): string | undefined {
    const found = this.referenceDataService.skills().find(s => s.name === name || s.id === name);
    return found?.id;
  }

  // Handler for skill selection
  onSkillSelected(selectedName: string): void {
    if (!selectedName) return;
    this.skillInput.set(selectedName);
    this.addSkill();
    this.showSkillSelector.set(false);
  }

  // Handler for autocomplete selection (receives role name)
  onRoleSelected(selectedName: string): void {
    if (!selectedName) return;
    this.roleInput.set(selectedName);
    // Immediately add by mapping name -> id inside addRole()
    this.addRole();
    // hide selector after selection
    this.showRoleSelector.set(false);
  }

  // Add by id handlers (used by reusable component)
  addRoleById(roleId: string): void {
    const user = this.currentUser();
    if (!user || !roleId) return;
    if (user.roles.includes(roleId)) {
      this.showError('Роль уже назначена');
      return;
    }
    const newRoles = [...user.roles, roleId];
    // Optimistic update
    this.currentUser.set({ ...user, roles: newRoles });
    // hide selector immediately
    this.showRoleSelector.set(false);
    this.userService.updateUserRoles(user.id, newRoles).subscribe({
      next: (updated) => this.currentUser.set(updated),
      error: () => this.currentUser.set(user)
    });
  }

  addTerritoryById(territoryId: string): void {
    const user = this.currentUser();
    if (!user || !territoryId) return;
    const assigned = user.territories || [];
    if (assigned.includes(territoryId)) { this.showError('Территория уже назначена'); return; }
    const newTerritories = [...assigned, territoryId];
    this.currentUser.set({ ...user, territories: newTerritories });
    this.userService.updateUser(user.id, { territories: newTerritories }).subscribe({
      next: (updated) => this.currentUser.set(updated),
      error: () => this.currentUser.set(user)
    });
  }

  addSkillById(skillId: string): void {
    const user = this.currentUser();
    if (!user || !skillId) return;
    const assigned = user.skills || [];
    if (assigned.includes(skillId)) { this.showError('Навык уже добавлен'); return; }
    const newSkills = [...assigned, skillId];
    this.currentUser.set({ ...user, skills: newSkills });
    this.userService.updateUser(user.id, { skills: newSkills }).subscribe({
      next: (updated) => this.currentUser.set(updated),
      error: () => this.currentUser.set(user)
    });
  }

  // Handler for territory selection
  onTerritorySelected(selectedName: string): void {
    if (!selectedName) return;
    this.territoryInput.set(selectedName);
    this.addTerritory();
    this.showTerritorySelector.set(false);
  }

  getRoleColor(role: string): 'primary' | 'accent' | 'warn' {
    switch (role) {
      case 'admin':
        return 'warn';
      case 'senior_manager':
      case 'team_lead':
        return 'primary';
      default:
        return 'accent';
    }
  }

  // Inline role management
  addRole(): void {
    const user = this.currentUser();
    let role = this.roleInput().trim();
    if (!user || !role) return;

    // If role was provided as a name via autocomplete, map to id
    const mapped = this.findRoleIdByName(role);
    if (mapped) role = mapped;

    // Avoid duplicates
    if (user.roles.includes(role)) {
      this.showError('Роль уже назначена');
      this.roleInput.set('');
      return;
    }

    // Optimistic update
    const newRoles = [...user.roles, role];
    this.currentUser.set({ ...user, roles: newRoles });
    // hide selector immediately
    this.showRoleSelector.set(false);

    this.userService.updateUserRoles(user.id, newRoles).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        this.showSuccess('Роль добавлена');
      },
      error: () => {
        // revert
        this.currentUser.set(user);
        this.showError('Не удалось добавить роль');
      },
      complete: () => {
        this.roleInput.set('');
      }
    });
  }

  // Inline territory management
  addTerritory(): void {
    const user = this.currentUser();
    let territory = this.territoryInput().trim();
    if (!user || !territory) return;

    // Map name->id if needed
    const mapped = this.findTerritoryIdByName(territory);
    if (mapped) territory = mapped;

    // Avoid duplicates
    if ((user.territories || []).includes(territory)) {
      this.showError('Территория уже назначена');
      this.territoryInput.set('');
      return;
    }

    const newTerritories = [...(user.territories || []), territory];
    this.currentUser.set({ ...user, territories: newTerritories });

    this.userService.updateUser(user.id, { territories: newTerritories }).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        this.showSuccess('Территория добавлена');
      },
      error: () => {
        this.currentUser.set(user);
        this.showError('Не удалось добавить территорию');
      },
      complete: () => this.territoryInput.set('')
    });
  }

  // Inline skill management
  addSkill(): void {
    const user = this.currentUser();
    let skill = this.skillInput().trim();
    if (!user || !skill) return;

    // Map name->id if needed
    const mapped = this.findSkillIdByName(skill);
    if (mapped) skill = mapped;

    // Avoid duplicates
    if ((user.skills || []).includes(skill)) {
      this.showError('Навык уже добавлен');
      this.skillInput.set('');
      return;
    }

    const newSkills = [...(user.skills || []), skill];
    this.currentUser.set({ ...user, skills: newSkills });

    this.userService.updateUser(user.id, { skills: newSkills }).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        this.showSuccess('Навык добавлен');
      },
      error: () => {
        this.currentUser.set(user);
        this.showError('Не удалось добавить навык');
      },
      complete: () => this.skillInput.set('')
    });
  }

  removeSkill(skillToRemove: string): void {
    const user = this.currentUser();
    if (!user) return;

    const newSkills = (user.skills || []).filter((s) => s !== skillToRemove);
    this.currentUser.set({ ...user, skills: newSkills });

    this.userService.updateUser(user.id, { skills: newSkills }).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        this.showSuccess('Навык удалён');
      },
      error: () => {
        this.currentUser.set(user);
        this.showError('Не удалось удалить навык');
      }
    });
  }

  removeTerritory(territoryToRemove: string): void {
    const user = this.currentUser();
    if (!user) return;

    const newTerritories = (user.territories || []).filter((t) => t !== territoryToRemove);
    this.currentUser.set({ ...user, territories: newTerritories });

    this.userService.updateUser(user.id, { territories: newTerritories }).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        this.showSuccess('Территория удалена');
      },
      error: () => {
        this.currentUser.set(user);
        this.showError('Не удалось удалить территорию');
      }
    });
  }

  removeRole(roleToRemove: string): void {
    const user = this.currentUser();
    if (!user) return;

    const newRoles = user.roles.filter((r) => r !== roleToRemove);

    // Optimistic update
    this.currentUser.set({ ...user, roles: newRoles });

    this.userService.updateUserRoles(user.id, newRoles).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        this.showSuccess('Роль удалена');
      },
      error: () => {
        // revert
        this.currentUser.set(user);
        this.showError('Не удалось удалить роль');
      }
    });
  }

  formatDate(date?: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getSkillsWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'навыками';
    }

    switch (lastDigit) {
      case 1:
        return 'навыком';
      case 2:
      case 3:
      case 4:
        return 'навыками';
      default:
        return 'навыками';
    }
  }

  getTerritoriesWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'территорий';
    }

    switch (lastDigit) {
      case 1:
        return 'территорию';
      case 2:
      case 3:
      case 4:
        return 'территории';
      default:
        return 'территорий';
    }
  }

  private loadUser(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        if (user) {
          this.currentUser.set(user);
          this.loadManagerInfo(user.managerID);
          // load assigned entities (leads, deals, tasks)
          this.loadAssignedEntities(user.id);
        } else {
          this.showError('Пользователь не найден');
          this.goBack();
        }
      },
      error: () => {
        this.showError('Ошибка при загрузке пользователя');
        this.goBack();
      }
    });
  }

  private loadAssignedEntities(userId: number): void {
    this.assignedLoading.set(true);

    // Leads via manager endpoint
    this.leadService.getLeadsByManager(String(userId)).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (leads) => this.assignedLeads.set(leads || []),
      error: () => this.assignedLeads.set([])
    });

    // Deals via manager endpoint
    this.dealsService.getDealsByManager(String(userId)).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (deals) => this.assignedDeals.set(deals || []),
      error: () => this.assignedDeals.set([])
    });

    // Tasks: fetch user's task assignments then load tasks
    this.assignmentService.getUserAssignments(userId, 'task').pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (assignments) => {
        const ids = (assignments || []).map((a: any) => Number(a.entityId)).filter(Boolean);
        if (ids.length === 0) {
          this.assignedTasks.set([]);
          this.assignedLoading.set(false);
          // still load analytics even if there are no tasks
          this.loadPerformanceAnalytics(userId);
          return;
        }

        const calls = ids.map((id: number) => this.tasksService.get(id).pipe(catchError(() => of(null))));
        forkJoin(calls).subscribe({
          next: (tasks) => {
            this.assignedTasks.set((tasks || []).filter(Boolean));
            this.assignedLoading.set(false);
            // load analytics in parallel
            this.loadPerformanceAnalytics(userId);
          },
          error: () => {
            this.assignedTasks.set([]);
            this.assignedLoading.set(false);
            this.loadPerformanceAnalytics(userId);
          }
        });
      },
      error: () => {
        this.assignedTasks.set([]);
        this.assignedLoading.set(false);
        this.loadPerformanceAnalytics(userId);
      }
    });
  }

  private loadPerformanceAnalytics(userId: number): void {
    this.performanceLoading.set(true);

    this.assignmentService.getAssignmentStatistics('30d', 'user').pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (rows: any[]) => {
        const found = (rows || []).find((r: any) => Number(r.userId) === Number(userId) || String(r.userId) === String(userId));
        this.performanceStats.set(found || null);
        this.performanceLoading.set(false);
      },
      error: () => {
        this.performanceStats.set(null);
        this.performanceLoading.set(false);
      }
    });
  }

  private loadManagerInfo(managerId?: number): void {
    if (!managerId) return;

    this.userService.getUserById(managerId).subscribe({
      next: (manager) => {
        this.managerInfo.set(manager);
      },
      error: () => {
        // Ignore manager loading errors
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Закрыть', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Закрыть', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}