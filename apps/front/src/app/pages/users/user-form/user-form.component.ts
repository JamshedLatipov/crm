import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { UserManagementService, User, CreateUserRequest, UpdateUserRequest } from '../../../services/user-management.service';
import { ReferenceDataService } from '../../../services/reference-data.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatAutocompleteModule
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent implements OnInit {
  // Public properties (must be declared before protected)
  public readonly isEditMode = signal<boolean>(false);
  public readonly currentUser = signal<User | null>(null);
  public readonly selectedSkills = signal<string[]>([]);
  public readonly selectedTerritories = signal<string[]>([]);
  // Keep initial values to detect selection-only changes
  private initialSkills: string[] = [];
  private initialTerritories: string[] = [];

  public readonly selectionChanged = computed(() => {
    try {
      const skillsChanged = JSON.stringify(this.selectedSkills()) !== JSON.stringify(this.initialSkills);
      const territoriesChanged = JSON.stringify(this.selectedTerritories()) !== JSON.stringify(this.initialTerritories);
      return skillsChanged || territoriesChanged;
    } catch {
      return false;
    }
  });
  public readonly availableManagers = signal<User[]>([]);
  public readonly currentStep = signal<number>(1);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly totalSteps = 4;
  public readonly stepTitles = [
    'Основная информация',
    'Роли и статус',
    'Рабочие настройки',
    'Навыки и территории'
  ];
  public userForm: FormGroup;
  public readonly availableRoles = computed(() =>
    this.referenceDataService.activeRoles().map(r => ({ value: r.id, label: r.name }))
  );
  public readonly availableDepartments = computed(() =>
    this.referenceDataService.activeDepartments().map(d => ({ value: d.id, label: d.name }))
  );
  public readonly availableSkills = computed(() =>
    this.referenceDataService.activeSkills().map(s => s.name)
  );
  public readonly availableTerritories = computed(() =>
    this.referenceDataService.activeTerritories().map(t => t.name)
  );

  // Password generation state
  public readonly passwordCopied = signal<boolean>(false);

  protected readonly userService = inject(UserManagementService);
  protected readonly referenceDataService = inject(ReferenceDataService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    this.userForm = this.createForm();
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    
    if (userId && userId !== 'create') {
      this.isEditMode.set(true);
      this.loadUser(parseInt(userId));
    } else {
      this.isEditMode.set(false);
      // Recreate form for create mode to include password fields
      this.userForm = this.createForm();
    }

    this.loadManagers();
  }

  // Public methods (must be declared before private)
  isRoleSelected(role: string): boolean {
    const roles = this.userForm.get('roles')?.value || [];
    return roles.includes(role);
  }

  toggleRole(role: string, checked: boolean): void {
    const currentRoles = this.userForm.get('roles')?.value || [];
    let newRoles: string[];

    if (checked) {
      newRoles = [...currentRoles, role];
    } else {
      newRoles = currentRoles.filter((r: string) => r !== role);
    }

    this.userForm.patchValue({ roles: newRoles });
  }

  getRoleDescription(role: string): string {
    const roleData = this.referenceDataService.getRoleById(role);
    return roleData?.description || 'Стандартная роль пользователя';
  }

  formatCapacity = (value: number): string => {
    return `${value}%`;
  }

  hasFormErrors(): boolean {
    return this.userForm.invalid && this.userForm.touched;
  }

  onCancel(): void {
    this.goBack();
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      // Allow navigation to any previous step or next step if current is valid
      if (step <= this.currentStep() || (step === this.currentStep() + 1 && this.canProceedToNextStep())) {
        this.currentStep.set(step);
      }
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps && this.canProceedToNextStep()) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep()) {
      case 1: { // Basic Information
        const username = this.userForm.get('username');
        const email = this.userForm.get('email');
        const firstName = this.userForm.get('firstName');
        const lastName = this.userForm.get('lastName');

        return !!(username?.valid && username?.value?.trim() &&
                 email?.valid && email?.value?.trim() &&
                 firstName?.value?.trim() && lastName?.value?.trim());
      }

      case 2: { // Roles and Status
        const roles = this.userForm.get('roles')?.value;
        return !!(roles && Array.isArray(roles) && roles.length > 0);
      }

      case 3: // Work Settings
        return true; // Optional fields

      case 4: // Skills and Territories
        return true; // Optional fields

      default:
        return false;
    }
  }

  canProceedToStep(step: number): boolean {
    // Save current step
    const originalStep = this.currentStep();

    // Check each step up to the target step
    for (let i = 1; i < step; i++) {
      this.currentStep.set(i);
      if (!this.canProceedToNextStep()) {
        // Restore original step
        this.currentStep.set(originalStep);
        return false;
      }
    }

    // Restore original step
    this.currentStep.set(originalStep);
    return true;
  }

  addSkill(skill: string): void {
    skill = skill.trim();
    if (skill && !this.selectedSkills().includes(skill)) {
      this.selectedSkills.set([...this.selectedSkills(), skill]);
    }
  }

  removeSkill(skill: string): void {
    this.selectedSkills.set(this.selectedSkills().filter(s => s !== skill));
  }

  clearAllSkills(): void {
    this.selectedSkills.set([]);
  }

  addTerritory(territory: string): void {
    territory = territory.trim();
    if (territory && !this.selectedTerritories().includes(territory)) {
      this.selectedTerritories.set([...this.selectedTerritories(), territory]);
    }
  }

  removeTerritory(territory: string): void {
    this.selectedTerritories.set(this.selectedTerritories().filter(t => t !== territory));
  }

  clearAllTerritories(): void {
    this.selectedTerritories.set([]);
  }

  save(): void {
    // For edit mode allow submission when either the form is valid or only selections changed
    const canSubmit = (!this.isEditMode() && this.userForm.valid) || (this.isEditMode() && (this.userForm.valid || this.selectionChanged()));

    if (canSubmit && !this.isSubmitting()) {
      const formData = this.userForm.value;

      // Add skills and territories
      formData.skills = this.selectedSkills();
      formData.territories = this.selectedTerritories();

      // Convert empty managerID to null
      if (!formData.managerID || formData.managerID === '') {
        formData.managerID = null;
      }

      if (this.isEditMode()) {
        this.updateUser(formData);
      } else {
        this.createUser(formData);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  // Utility methods
  formatLabel(value: number): string {
    return `${value}`;
  }

  generatePassword(): void {
    // Generate a secure password with uppercase, lowercase, numbers and special characters
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest to make it 12 characters long
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    // Set the password in both fields
    this.userForm.patchValue({
      password: password,
      confirmPassword: password
    });

    // Reset copy state when generating new password
    this.passwordCopied.set(false);
  }

  async copyPassword(): Promise<void> {
    const password = this.userForm.get('password')?.value;

    if (!password) {
      this.snackBar.open('Пароль не сгенерирован', 'Закрыть', { duration: 3000 });
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      this.passwordCopied.set(true);

      // Show success message
      this.snackBar.open('Пароль скопирован в буфер обмена', 'Закрыть', { duration: 3000 });

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        this.passwordCopied.set(false);
      }, 3000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = password;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.passwordCopied.set(true);
      this.snackBar.open('Пароль скопирован в буфер обмена', 'Закрыть', { duration: 3000 });

      setTimeout(() => {
        this.passwordCopied.set(false);
      }, 3000);
    }
  }

  private createForm(): FormGroup {
    const baseConfig: Record<string, unknown> = {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      firstName: [''],
      lastName: [''],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      department: [''],
      roles: [[], [Validators.required]],
      maxLeadsCapacity: [15],
      managerID: [null],
      isActive: [true],
      isAvailableForAssignment: [true]
    };

    // Add password fields only for create mode
    if (!this.isEditMode()) {
      baseConfig['password'] = ['', [Validators.required, Validators.minLength(6)]];
      baseConfig['confirmPassword'] = ['', [Validators.required]];
    }

    const form = this.fb.group(baseConfig);

    // Add password confirmation validator for create mode
    if (!this.isEditMode()) {
      form.setValidators(this.passwordMatchValidator);
    }

    return form;
  }

  private passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private loadUser(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        if (user) {
          this.currentUser.set(user);
          this.populateForm(user);
        }
      },
      error: () => {
        this.snackBar.open('Ошибка при загрузке пользователя', 'Закрыть', {
          duration: 5000
        });
        this.goBack();
      }
    });
  }

  private populateForm(user: User): void {
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      department: user.department,
      roles: user.roles,
      maxLeadsCapacity: user.maxLeadsCapacity,
      managerID: user.managerID,
      isActive: user.isActive,
      isAvailableForAssignment: user.isAvailableForAssignment
    });

    this.selectedSkills.set(user.skills || []);
    this.selectedTerritories.set(user.territories || []);

    // store initial selections so we can detect selection-only changes
    this.initialSkills = [...(user.skills || [])];
    this.initialTerritories = [...(user.territories || [])];
  }

  private loadManagers(): void {
    // Get users who can be managers (with manager roles)
    const managerRoles = ['admin', 'senior_manager', 'team_lead'];
    const allUsers = this.userService.users();
    const managers = allUsers.filter(user => 
      user.isActive && 
      user.roles.some(role => managerRoles.includes(role)) &&
      (!this.currentUser() || user.id !== this.currentUser()?.id)
    );
    this.availableManagers.set(managers);
  }

  private createUser(userData: CreateUserRequest): void {
    this.isSubmitting.set(true);

    this.userService.createUser(userData).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.snackBar.open('Пользователь создан успешно', 'Закрыть', {
          duration: 3000
        });
        this.router.navigate(['/users', user.id]);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Ошибка при создании пользователя', 'Закрыть', {
          duration: 5000
        });
      }
    });
  }

  private updateUser(userData: UpdateUserRequest): void {
    const userId = this.currentUser()?.id;
    if (!userId) return;

    this.isSubmitting.set(true);

    this.userService.updateUser(userId, userData).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.snackBar.open('Пользователь обновлен успешно', 'Закрыть', {
          duration: 3000
        });
        this.router.navigate(['/users', user.id]);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Ошибка при обновлении пользователя', 'Закрыть', {
          duration: 5000
        });
      }
    });
  }
}