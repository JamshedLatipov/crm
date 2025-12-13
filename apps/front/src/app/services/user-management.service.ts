import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '@crm/front/environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  roles: string[];
  skills?: string[];
  territories?: string[];
  currentLeadsCount: number;
  maxLeadsCapacity: number;
  // Deals workload
  currentDealsCount: number;
  maxDealsCapacity: number;
  // Tasks workload
  currentTasksCount: number;
  maxTasksCapacity: number;
  conversionRate: number;
  totalRevenue: number;
  totalLeadsHandled: number;
  managerID?: number;
  isActive: boolean;
  isAvailableForAssignment: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  sipEndpointId?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  roles: string[];
  skills?: string[];
  territories?: string[];
  maxLeadsCapacity?: number;
  maxDealsCapacity?: number;
  maxTasksCapacity?: number;
  managerID?: number;
  isAvailableForAssignment?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  roles?: string[];
  skills?: string[];
  territories?: string[];
  maxLeadsCapacity?: number;
  maxDealsCapacity?: number;
  maxTasksCapacity?: number;
  managerID?: number;
  isActive?: boolean;
  isAvailableForAssignment?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  managerID?: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  averageConversion: number;
  topPerformers: User[];
  roleDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  // Public properties
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly users = signal<User[]>([]);
  public readonly filteredUsers = signal<User[]>([]);
  public readonly selectedUser = signal<User | null>(null);
  public readonly filters = signal<UserFilters>({});
  public readonly totalUsers = computed(() => this.users().length);

  public readonly activeUsers = computed(
    () => this.users().filter((u) => u.isActive).length
  );
  public readonly availableUsers = computed(
    () =>
      this.users().filter((u) => u.isActive && u.isAvailableForAssignment)
        .length
  );
  public readonly departments = computed(() => [
    ...new Set(
      this.users()
        .map((u) => u.department)
        .filter(Boolean)
    ),
  ]);
  public readonly roles = computed(() => [
    ...new Set(this.users().flatMap((u) => u.roles)),
  ]);

  private readonly http: HttpClient = inject(HttpClient);

  // Private properties
  private readonly apiUrl = environment.apiBase + '/users';
  private usersSubject = new BehaviorSubject<User[]>([]);
  private selectedUserSubject = new BehaviorSubject<User | null>(null);

  users$: Observable<User[]> = this.usersSubject.asObservable();
  selectedUser$: Observable<User | null> = this.selectedUserSubject.asObservable();

  // CRUD Operations
  loadUsers(refresh = false): Observable<User[]> {
    if (!refresh && this.users().length > 0) {
      return of(this.users());
    }

    this.setLoading(true);
    return this.http.get<User[]>(this.apiUrl).pipe(
      tap((users) => {
        this.users.set(users);
        this.usersSubject.next(users);
        this.applyFilters();
        console.log('Loading users, refresh:', refresh, this.users());
      }),
      catchError(() => {
        this.setError('Failed to load users');
        return of([]);
      }),
      tap(() => this.setLoading(false)),
      shareReplay(1)
    );
  }

  getUserById(id: number): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      tap((user) => {
        this.selectedUser.set(user);
        this.selectedUserSubject.next(user);
      }),
      catchError(() => {
        this.setError(`Failed to load user with ID ${id}`);
        return of(null);
      })
    );
  }

  createUser(userData: CreateUserRequest): Observable<User> {
    this.setLoading(true);
    return this.http.post<User>(this.apiUrl, userData).pipe(
      tap((newUser) => {
        const currentUsers = this.users();
        this.users.set([...currentUsers, newUser]);
        this.usersSubject.next(this.users());
        this.applyFilters();
      }),
      catchError((error) => {
        this.setError('Failed to create user');
        throw error;
      }),
      tap(() => this.setLoading(false))
    );
  }

  updateUser(id: number, userData: UpdateUserRequest): Observable<User> {
    this.setLoading(true);
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData).pipe(
      tap((updatedUser) => {
        const currentUsers = this.users();
        const index = currentUsers.findIndex((u) => u.id === id);
        if (index !== -1) {
          currentUsers[index] = updatedUser;
          this.users.set([...currentUsers]);
          this.usersSubject.next(this.users());
          this.applyFilters();
        }
        if (this.selectedUser()?.id === id) {
          this.selectedUser.set(updatedUser);
          this.selectedUserSubject.next(updatedUser);
        }
      }),
      catchError((error) => {
        this.setError('Failed to update user');
        throw error;
      }),
      tap(() => this.setLoading(false))
    );
  }

  deleteUser(id: number): Observable<void> {
    this.setLoading(true);
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const currentUsers = this.users().filter((u) => u.id !== id);
        this.users.set(currentUsers);
        this.usersSubject.next(currentUsers);
        this.applyFilters();
        if (this.selectedUser()?.id === id) {
          this.selectedUser.set(null);
          this.selectedUserSubject.next(null);
        }
      }),
      catchError((error) => {
        this.setError('Failed to delete user');
        throw error;
      }),
      tap(() => this.setLoading(false))
    );
  }

  // User activation/deactivation
  toggleUserStatus(id: number): Observable<User | undefined> {
    const user = this.users().find((u) => u.id === id);
    if (!user) {
      return of(undefined);
    }

    return this.updateUser(id, { isActive: !user.isActive });
  }

  // Password management
  changePassword(
    id: number,
    newPassword: string
  ): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(`${this.apiUrl}/${id}/change-password`, {
        password: newPassword,
      })
      .pipe(
        catchError(() => {
          this.setError('Failed to change password');
          throw new Error('Failed to change password');
        })
      );
  }

  resetPassword(id: number): Observable<{ temporaryPassword: string }> {
    return this.http
      .post<{ temporaryPassword: string }>(
        `${this.apiUrl}/${id}/reset-password`,
        {}
      )
      .pipe(
        catchError((error) => {
          this.setError('Failed to reset password');
          throw error;
        })
      );
  }

  // Role management
  updateUserRoles(id: number, roles: string[]): Observable<User> {
    return this.updateUser(id, { roles });
  }

  // Filtering and search
  setFilters(newFilters: UserFilters): void {
    this.filters.set({ ...this.filters(), ...newFilters });
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters.set({});
    this.applyFilters();
  }

  private applyFilters(): void {
    const currentFilters = this.filters();
    let filtered = this.users();

    if (currentFilters.search) {
      const searchTerm = (currentFilters.search || '').toLowerCase();
      filtered = filtered.filter((user) => {
        const username = (user.username || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const department = (user.department || '').toLowerCase();

        return (
          username.includes(searchTerm) ||
          email.includes(searchTerm) ||
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          department.includes(searchTerm)
        );
      });
    }

    if (currentFilters.role) {
      filtered = filtered.filter((user) =>
        user.roles.includes(currentFilters.role || '')
      );
    }

    if (currentFilters.department) {
      filtered = filtered.filter(
        (user) => user.department === currentFilters.department
      );
    }

    if (currentFilters.isActive !== undefined) {
      filtered = filtered.filter(
        (user) => user.isActive === currentFilters.isActive
      );
    }

    if (currentFilters.isAvailable !== undefined) {
      filtered = filtered.filter(
        (user) => user.isAvailableForAssignment === currentFilters.isAvailable
      );
    }

    if (currentFilters.managerID !== undefined) {
      filtered = filtered.filter(
        (user) => user.managerID === currentFilters.managerID
      );
    }

    this.filteredUsers.set(filtered);
  }

  // Statistics
  getUserStatistics(): Observable<UserStatistics> {
    return this.http.get<UserStatistics>(`${this.apiUrl}/statistics`).pipe(
      catchError((error) => {
        this.setError('Failed to load user statistics');
        // Return mock data as fallback
        return of(this.calculateLocalStatistics());
      })
    );
  }

  private calculateLocalStatistics(): UserStatistics {
    const users = this.users();
    const activeUsers = users.filter((u) => u.isActive);

    // Calculate role distribution
    const roleDistribution: Record<string, number> = {};
    users.forEach((user) => {
      user.roles.forEach((role) => {
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });
    });

    // Calculate department distribution
    const departmentDistribution: Record<string, number> = {};
    users.forEach((user) => {
      if (user.department) {
        departmentDistribution[user.department] =
          (departmentDistribution[user.department] || 0) + 1;
      }
    });

    // Get top performers
    const topPerformers = users
      .filter((u) => u.isActive)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);

    return {
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      totalDepartments: this.departments().length,
      averageConversion:
        activeUsers.length > 0
          ? activeUsers.reduce((sum, u) => sum + u.conversionRate, 0) /
            activeUsers.length
          : 0,
      topPerformers,
      roleDistribution,
      departmentDistribution,
    };
  }

  // Utility methods
  private setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  private setError(error: string | null): void {
    this.error.set(error);
  }

  clearError(): void {
    this.setError(null);
  }

  // Bulk operations
  bulkUpdateUsers(
    userIds: number[],
    updates: UpdateUserRequest
  ): Observable<User[]> {
    this.setLoading(true);
    return this.http
      .post<User[]>(`${this.apiUrl}/bulk-update`, { userIds, updates })
      .pipe(
        tap((updatedUsers) => {
          const currentUsers = this.users();
          updatedUsers.forEach((updatedUser) => {
            const index = currentUsers.findIndex(
              (u) => u.id === updatedUser.id
            );
            if (index !== -1) {
              currentUsers[index] = updatedUser;
            }
          });
          this.users.set([...currentUsers]);
          this.usersSubject.next(this.users());
          this.applyFilters();
        }),
        catchError((error) => {
          this.setError('Failed to bulk update users');
          throw error;
        }),
        tap(() => this.setLoading(false))
      );
  }

  bulkDeleteUsers(userIds: number[]): Observable<void> {
    this.setLoading(true);
    return this.http.post<void>(`${this.apiUrl}/bulk-delete`, { userIds }).pipe(
      tap(() => {
        const currentUsers = this.users().filter(
          (u) => !userIds.includes(u.id)
        );
        this.users.set(currentUsers);
        this.usersSubject.next(currentUsers);
        this.applyFilters();
      }),
      catchError((error) => {
        this.setError('Failed to bulk delete users');
        throw error;
      }),
      tap(() => this.setLoading(false))
    );
  }

  // Export functionality
  exportUsers(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/export`, {
        params: { format },
        responseType: 'blob',
      })
      .pipe(
        catchError((error) => {
          this.setError('Failed to export users');
          throw error;
        })
      );
  }
}
