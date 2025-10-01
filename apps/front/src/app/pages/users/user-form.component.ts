import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { UserManagementService, User, CreateUserRequest, UpdateUserRequest } from '../../services/user-management.service';

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
  template: `
    <div class="user-form-container">
      <!-- Hero Header -->
      <div class="hero-header">
        <div class="hero-content">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          
          <div class="hero-text">
            <h1 class="hero-title">
              {{ isEditMode() ? 'Редактирование пользователя' : 'Добро пожаловать!' }}
            </h1>
            <p class="hero-subtitle">
              {{ isEditMode() 
                ? 'Обновите информацию о пользователе' 
                : 'Создайте новый аккаунт пользователя в системе' 
              }}
            </p>
            @if (isEditMode() && currentUser()) {
              <div class="current-user-badge">
                <mat-icon>person</mat-icon>
                <span>{{ currentUser()?.firstName }} {{ currentUser()?.lastName }}</span>
              </div>
            }
          </div>

          <div class="hero-actions">
            <button mat-stroked-button (click)="goBack()" [disabled]="isSubmitting()" class="cancel-btn">
              <mat-icon>close</mat-icon>
              Отмена
            </button>
            <button 
              mat-raised-button 
              color="primary"
              (click)="save()"
              [disabled]="userForm.invalid || isSubmitting()"
              class="save-btn"
            >
              @if (isSubmitting()) {
                <mat-spinner diameter="16" class="mr-2"></mat-spinner>
              } @else {
                <mat-icon>{{ isEditMode() ? 'save' : 'person_add' }}</mat-icon>
              }
              {{ isEditMode() ? 'Сохранить изменения' : 'Создать пользователя' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Progress indicator for create mode -->
      @if (!isEditMode()) {
        <div class="progress-container">
          <div class="progress-steps">
            @for (title of stepTitles; track $index; let isLast = $last) {
              <div class="step" 
                   [class.active]="currentStep() === $index + 1" 
                   [class.completed]="currentStep() > $index + 1"
                   (click)="goToStep($index + 1)">
                <div class="step-circle">
                  @if (currentStep() > $index + 1) {
                    <mat-icon>check</mat-icon>
                  } @else {
                    {{$index + 1}}
                  }
                </div>
                <span>{{title}}</span>
              </div>
              @if (!isLast) {
                <div class="step-divider" [class.active]="currentStep() > $index + 1"></div>
              }
            }
          </div>
        </div>
      }

      <!-- Error message -->
      @if (userService.error()) {
        <div class="error-alert">
          <mat-icon>error_outline</mat-icon>
          <div class="error-content">
            <h4>Ошибка</h4>
            <p>{{ userService.error() }}</p>
          </div>
          <button mat-icon-button (click)="userService.clearError()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <form [formGroup]="userForm" class="form-content">
        <!-- Step 1: Basic Information -->
        @if (currentStep() === 1) {
          <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <mat-icon>person</mat-icon>
            </div>
            <div class="section-title">
              <h2>Основная информация</h2>
              <p>Базовые данные пользователя для входа в систему</p>
            </div>
          </div>

          <div class="form-grid">
            <!-- Username -->
            <div class="form-field full-width">
              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Логин пользователя</mat-label>
                <input matInput formControlName="username" placeholder="user.name">
                <mat-icon matSuffix>alternate_email</mat-icon>
                @if (userForm.get('username')?.errors?.['required']) {
                  <mat-error>Логин обязателен для входа в систему</mat-error>
                }
                @if (userForm.get('username')?.errors?.['minlength']) {
                  <mat-error>Логин должен содержать минимум 3 символа</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Email -->
            <div class="form-field full-width">
              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Электронная почта</mat-label>
                <input matInput formControlName="email" type="email" placeholder="user@company.com">
                <mat-icon matSuffix>email</mat-icon>
                @if (userForm.get('email')?.errors?.['required']) {
                  <mat-error>Email обязателен для уведомлений</mat-error>
                }
                @if (userForm.get('email')?.errors?.['email']) {
                  <mat-error>Введите корректный email адрес</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- First Name -->
            <div class="form-field">
              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Имя</mat-label>
                <input matInput formControlName="firstName" placeholder="Иван">
                <mat-icon matSuffix>badge</mat-icon>
              </mat-form-field>
            </div>

            <!-- Last Name -->
            <div class="form-field">
              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Фамилия</mat-label>
                <input matInput formControlName="lastName" placeholder="Иванов">
                <mat-icon matSuffix>badge</mat-icon>
              </mat-form-field>
            </div>

            <!-- Phone -->
            <div class="form-field">
              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Телефон</mat-label>
                <input matInput formControlName="phone" placeholder="+7 (999) 123-45-67">
                <mat-icon matSuffix>phone</mat-icon>
              </mat-form-field>
            </div>

            <!-- Department -->
            <div class="form-field">
              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Департамент</mat-label>
                <mat-select formControlName="department">
                  @for (dept of availableDepartments; track dept) {
                    <mat-option [value]="dept">{{ dept }}</mat-option>
                  }
                </mat-select>
                <mat-icon matSuffix>business</mat-icon>
              </mat-form-field>
            </div>

            <!-- Password fields for create mode -->
            @if (!isEditMode()) {
              <div class="form-field">
                <mat-form-field appearance="outline" class="modern-field">
                  <mat-label>Пароль</mat-label>
                  <input matInput formControlName="password" type="password" placeholder="Минимум 6 символов">
                  <mat-icon matSuffix>lock</mat-icon>
                  @if (userForm.get('password')?.errors?.['required']) {
                    <mat-error>Пароль обязателен</mat-error>
                  }
                  @if (userForm.get('password')?.errors?.['minlength']) {
                    <mat-error>Минимум 6 символов</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="form-field">
                <mat-form-field appearance="outline" class="modern-field">
                  <mat-label>Подтвердите пароль</mat-label>
                  <input matInput formControlName="confirmPassword" type="password" placeholder="Повторите пароль">
                  <mat-icon matSuffix>lock_outline</mat-icon>
                  @if (userForm.get('confirmPassword')?.errors?.['required']) {
                    <mat-error>Подтверждение пароля обязательно</mat-error>
                  }
                  @if (userForm.get('confirmPassword')?.errors?.['passwordMismatch']) {
                    <mat-error>Пароли не совпадают</mat-error>
                  }
                </mat-form-field>
              </div>
            }
          </div>
        </div>
        }

        <!-- Step 2: Roles and Permissions -->
        @if (currentStep() === 2) {
          <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <mat-icon>admin_panel_settings</mat-icon>
            </div>
            <div class="section-title">
              <h2>Роли и права доступа</h2>
              <p>Определите уровень доступа и ответственности пользователя</p>
            </div>
          </div>

          <!-- Roles Selection -->
          <div class="roles-section">
            <h3 class="subsection-title">
              <mat-icon>security</mat-icon>
              Роли в системе
              <span class="required-indicator">*</span>
            </h3>
            <div class="roles-grid">
              @for (role of availableRoles; track role.value) {
                <div class="role-card" [class.selected]="isRoleSelected(role.value)">
                  <mat-checkbox
                    [checked]="isRoleSelected(role.value)"
                    (change)="toggleRole(role.value, $event.checked)"
                    class="role-checkbox"
                  >
                    <div class="role-info">
                      <div class="role-name">{{ role.label }}</div>
                      <div class="role-description">{{ getRoleDescription(role.value) }}</div>
                    </div>
                  </mat-checkbox>
                </div>
              }
            </div>
            @if (userForm.get('roles')?.errors?.['required']) {
              <div class="error-message">
                <mat-icon>error_outline</mat-icon>
                Выберите хотя бы одну роль для пользователя
              </div>
            }
          </div>

          <!-- Status Options -->
          <div class="status-section">
            <h3 class="subsection-title">
              <mat-icon>toggle_on</mat-icon>
              Статус и доступность
            </h3>
            <div class="status-options">
              <div class="status-option">
                <mat-checkbox formControlName="isActive" class="status-checkbox">
                  <div class="status-info">
                    <div class="status-name">Активный пользователь</div>
                    <div class="status-description">Пользователь может входить в систему</div>
                  </div>
                </mat-checkbox>
              </div>
              <div class="status-option">
                <mat-checkbox formControlName="isAvailableForAssignment" class="status-checkbox">
                  <div class="status-info">
                    <div class="status-name">Доступен для назначений</div>
                    <div class="status-description">Может получать новые задачи и лиды</div>
                  </div>
                </mat-checkbox>
              </div>
            </div>
          </div>
        </div>
        }

        <!-- Step 3: Work Configuration and Skills -->
        @if (currentStep() === 3) {
          <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <mat-icon>work</mat-icon>
            </div>
            <div class="section-title">
              <h2>Рабочие настройки</h2>
              <p>Настройте рабочую нагрузку и зоны ответственности</p>
            </div>
          </div>

          <div class="work-settings-grid">
            <!-- Capacity and Manager -->
            <div class="settings-card">
              <h3 class="card-title">
                <mat-icon>tune</mat-icon>
                Нагрузка и подчинение
              </h3>
              
              <div class="capacity-section">
                <label class="capacity-label">
                  Максимальная нагрузка: 
                  <span class="capacity-value">{{ userForm.get('maxLeadsCapacity')?.value }} лидов</span>
                </label>
                <mat-slider 
                  min="5" 
                  max="50" 
                  step="1"
                  discrete
                  [displayWith]="formatLabel"
                  class="capacity-slider"
                >
                  <input matSliderThumb formControlName="maxLeadsCapacity">
                </mat-slider>
                <div class="capacity-hints">
                  <span>5 (Новичок)</span>
                  <span>50 (Эксперт)</span>
                </div>
              </div>

              <mat-form-field appearance="outline" class="modern-field">
                <mat-label>Руководитель</mat-label>
                <mat-select formControlName="managerID">
                  <mat-option value="">Без руководителя</mat-option>
                  @for (manager of availableManagers(); track manager.id) {
                    <mat-option [value]="manager.id">
                      {{ manager.firstName }} {{ manager.lastName }}
                    </mat-option>
                  }
                </mat-select>
                <mat-icon matSuffix>supervisor_account</mat-icon>
              </mat-form-field>
            </div>
          </div>
        </div>
        }

        <!-- Step 4: Skills and Territories -->
        @if (currentStep() === 4) {
          <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <mat-icon>stars</mat-icon>
            </div>
            <div class="section-title">
              <h2>Навыки и территории</h2>
              <p>Определите экспертизу и зоны ответственности</p>
            </div>
          </div>

          <!-- Skills Section -->
          <div class="skills-territories-grid">
            <div class="skills-card">
              <h3 class="card-title">
                <mat-icon>verified</mat-icon>
                Навыки и экспертиза
                @if (selectedSkills().length > 0) {
                  <span class="count-badge">{{ selectedSkills().length }}</span>
                }
              </h3>
              
              <div class="input-section">
                <div class="input-with-button">
                  <mat-form-field appearance="outline" class="skill-input">
                    <mat-label>Добавить навык</mat-label>
                    <input 
                      matInput 
                      #skillInput
                      placeholder="Начните вводить или выберите из списка..."
                      [matAutocomplete]="skillsAuto"
                      (keyup.enter)="addSkill(skillInput.value); skillInput.value = ''"
                    >
                    <mat-icon matSuffix>search</mat-icon>
                    <mat-autocomplete #skillsAuto="matAutocomplete" (optionSelected)="addSkill($event.option.value); skillInput.value = ''">
                      @for (skill of availableSkills; track skill) {
                        <mat-option [value]="skill">{{ skill }}</mat-option>
                      }
                    </mat-autocomplete>
                  </mat-form-field>
                  <button 
                    mat-fab 
                    color="primary" 
                    type="button"
                    (click)="addSkill(skillInput.value); skillInput.value = ''"
                    [disabled]="!skillInput.value?.trim()"
                    class="add-button"
                  >
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
              </div>
              
              <!-- Selected skills -->
              @if (selectedSkills().length > 0) {
                <div class="selected-items">
                  <div class="items-header">
                    <span>Выбранные навыки</span>
                    <button 
                      mat-button 
                      color="warn" 
                      type="button"
                      (click)="clearAllSkills()"
                      class="clear-button"
                    >
                      <mat-icon>clear_all</mat-icon>
                      Очистить
                    </button>
                  </div>
                  <div class="chips-container">
                    @for (skill of selectedSkills(); track skill) {
                      <mat-chip-row 
                        (removed)="removeSkill(skill)"
                        [removable]="true"
                        color="primary"
                        class="skill-chip"
                      >
                        <mat-icon matChipAvatar>star</mat-icon>
                        {{ skill }}
                        <button matChipRemove>
                          <mat-icon>cancel</mat-icon>
                        </button>
                      </mat-chip-row>
                    }
                  </div>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>school</mat-icon>
                  <p>Добавьте навыки для лучшего распределения задач</p>
                </div>
              }
            </div>

            <!-- Territories Section -->
            <div class="territories-card">
              <h3 class="card-title">
                <mat-icon>location_on</mat-icon>
                Территории
                @if (selectedTerritories().length > 0) {
                  <span class="count-badge">{{ selectedTerritories().length }}</span>
                }
              </h3>
              
              <div class="input-section">
                <div class="input-with-button">
                  <mat-form-field appearance="outline" class="territory-input">
                    <mat-label>Добавить территорию</mat-label>
                    <input 
                      matInput 
                      #territoryInput
                      placeholder="Начните вводить или выберите из списка..."
                      [matAutocomplete]="territoriesAuto"
                      (keyup.enter)="addTerritory(territoryInput.value); territoryInput.value = ''"
                    >
                    <mat-icon matSuffix>search</mat-icon>
                    <mat-autocomplete #territoriesAuto="matAutocomplete" (optionSelected)="addTerritory($event.option.value); territoryInput.value = ''">
                      @for (territory of availableTerritories; track territory) {
                        <mat-option [value]="territory">{{ territory }}</mat-option>
                      }
                    </mat-autocomplete>
                  </mat-form-field>
                  <button 
                    mat-fab 
                    color="accent" 
                    type="button"
                    (click)="addTerritory(territoryInput.value); territoryInput.value = ''"
                    [disabled]="!territoryInput.value?.trim()"
                    class="add-button"
                  >
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
              </div>
              
              <!-- Selected territories -->
              @if (selectedTerritories().length > 0) {
                <div class="selected-items">
                  <div class="items-header">
                    <span>Выбранные территории</span>
                    <button 
                      mat-button 
                      color="warn" 
                      type="button"
                      (click)="clearAllTerritories()"
                      class="clear-button"
                    >
                      <mat-icon>clear_all</mat-icon>
                      Очистить
                    </button>
                  </div>
                  <div class="chips-container">
                    @for (territory of selectedTerritories(); track territory) {
                      <mat-chip-row 
                        (removed)="removeTerritory(territory)"
                        [removable]="true"
                        color="accent"
                        class="territory-chip"
                      >
                        <mat-icon matChipAvatar>place</mat-icon>
                        {{ territory }}
                        <button matChipRemove>
                          <mat-icon>cancel</mat-icon>
                        </button>
                      </mat-chip-row>
                    }
                  </div>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>map</mat-icon>
                  <p>Добавьте территории для определения зон ответственности</p>
                </div>
              }
            </div>
          </div>
        </div>
        }

        <!-- Step Navigation -->
        <div class="step-navigation">
          <button mat-stroked-button 
                  (click)="previousStep()"
                  [disabled]="currentStep() === 1"
                  class="nav-button">
            <mat-icon>chevron_left</mat-icon>
            Назад
          </button>
          
          <div class="step-info">
            Шаг {{currentStep()}} из {{totalSteps}}
            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.25rem;">
              Можно продолжить: {{canProceedToNextStep() ? 'Да' : 'Нет'}}
            </div>
          </div>
          
          @if (currentStep() < totalSteps) {
            <button mat-raised-button 
                    color="primary"
                    (click)="nextStep()"
                    [disabled]="!canProceedToNextStep()"
                    class="nav-button">
              Далее
              <mat-icon>chevron_right</mat-icon>
            </button>
          } @else {
            <button mat-raised-button 
                    color="primary"
                    (click)="save()"
                    [disabled]="!userForm.valid || isSubmitting()"
                    class="nav-button">
              @if (isSubmitting()) {
                <mat-spinner diameter="20" style="margin-right: 8px;"></mat-spinner>
              }
              {{isEditMode() ? 'Сохранить изменения' : 'Создать пользователя'}}
            </button>
          }
        </div>

        <!-- Bottom Actions -->
        <div class="bottom-actions">
          <button mat-stroked-button (click)="goBack()" [disabled]="isSubmitting()" class="cancel-bottom">
            <mat-icon>arrow_back</mat-icon>
            Вернуться к списку
          </button>
          <button 
            mat-raised-button 
            color="primary"
            (click)="save()"
            [disabled]="userForm.invalid || isSubmitting()"
            class="save-bottom"
          >
            @if (isSubmitting()) {
              <mat-spinner diameter="16" class="mr-2"></mat-spinner>
            } @else {
              <mat-icon>{{ isEditMode() ? 'save' : 'person_add' }}</mat-icon>
            }
            {{ isEditMode() ? 'Сохранить изменения' : 'Создать пользователя' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .user-form-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
    }

    /* Hero Header */
    .hero-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 1.5rem 3rem;
      margin-bottom: -2rem;
      position: relative;
      overflow: hidden;
    }

    .hero-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
      z-index: 1;
    }

    .hero-content {
      position: relative;
      z-index: 2;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .back-button {
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      margin-top: 0.5rem;
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .hero-text {
      flex: 1;
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
    }

    .hero-subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .current-user-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .cancel-btn {
      color: white;
      border-color: rgba(255, 255, 255, 0.5);
    }

    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: white;
    }

    .save-btn {
      background: white;
      color: #667eea;
      font-weight: 600;
      padding: 0 2rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .save-btn:hover {
      background: #f8f9fa;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    /* Progress Steps */
    .progress-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem 2rem;
      position: relative;
      z-index: 3;
    }

    .progress-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      padding: 1.5rem;
      border-radius: 1rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      margin-top: 2rem;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: #6366f1;
      font-weight: 500;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .step:hover {
      color: #4f46e5;
    }

    .step.completed {
      color: #059669;
    }

    .step.completed .step-circle {
      background: #059669;
    }

    .step-circle {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .step-divider {
      width: 3rem;
      height: 2px;
      background: #e5e7eb;
      margin: 0 1rem;
      transition: background 0.3s ease;
    }

    .step-divider.active {
      background: #6366f1;
    }

    /* Step Navigation */
    .step-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 2rem;
      border-radius: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      margin: 2rem auto;
      max-width: 1200px;
    }

    .step-info {
      font-weight: 600;
      color: #374151;
      font-size: 1rem;
    }

    .nav-button {
      min-width: 120px;
      height: 48px;
      font-weight: 600;
    }

    .nav-button[disabled] {
      opacity: 0.5;
    }

    /* Error Alert */
    .error-alert {
      max-width: 1200px;
      margin: 0 auto 2rem;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 1rem;
      padding: 1rem 1.5rem;
      color: #dc2626;
    }

    .error-content h4 {
      margin: 0 0 0.25rem 0;
      font-weight: 600;
    }

    .error-content p {
      margin: 0;
      font-size: 0.9rem;
    }

    /* Form Content */
    .form-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem 2rem;
      position: relative;
    }

    .form-section {
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .section-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .section-title h2 {
      margin: 0 0 0.25rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
    }

    .section-title p {
      margin: 0;
      color: #6b7280;
      font-size: 0.95rem;
    }

    /* Form Grid */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
    }

    .form-field.full-width {
      grid-column: 1 / -1;
    }

    .modern-field {
      width: 100%;
    }

    .modern-field .mat-mdc-form-field-outline {
      border-radius: 0.75rem;
    }

    .modern-field .mat-mdc-form-field-focus-overlay {
      border-radius: 0.75rem;
    }

    /* Roles Section */
    .roles-section {
      padding: 2rem;
    }

    .subsection-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1.5rem;
    }

    .required-indicator {
      color: #ef4444;
      font-weight: 700;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .role-card {
      border: 2px solid #e5e7eb;
      border-radius: 1rem;
      padding: 1rem;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .role-card:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .role-card.selected {
      border-color: #6366f1;
      background: #f0f9ff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    }

    .role-checkbox {
      width: 100%;
    }

    .role-info {
      margin-left: 0.5rem;
    }

    .role-name {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .role-description {
      font-size: 0.85rem;
      color: #6b7280;
      line-height: 1.4;
    }

    /* Status Section */
    .status-section {
      padding: 2rem;
      border-top: 1px solid #f3f4f6;
    }

    .status-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-option {
      border: 2px solid #e5e7eb;
      border-radius: 1rem;
      padding: 1rem;
      transition: all 0.3s ease;
    }

    .status-option:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }

    .status-checkbox {
      width: 100%;
    }

    .status-info {
      margin-left: 0.5rem;
    }

    .status-name {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .status-description {
      font-size: 0.85rem;
      color: #6b7280;
    }

    /* Work Settings */
    .work-settings-grid {
      padding: 2rem;
    }

    .settings-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1.5rem;
    }

    .capacity-section {
      margin-bottom: 2rem;
    }

    .capacity-label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
    }

    .capacity-value {
      color: #6366f1;
      font-weight: 700;
    }

    .capacity-slider {
      width: 100%;
      margin: 1rem 0;
    }

    .capacity-hints {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #6b7280;
    }

    /* Skills and Territories */
    .skills-territories-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      padding: 2rem;
    }

    @media (max-width: 768px) {
      .skills-territories-grid {
        grid-template-columns: 1fr;
      }
    }

    .skills-card,
    .territories-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
      height: fit-content;
    }

    .count-badge {
      background: #6366f1;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }

    .input-section {
      margin-bottom: 1.5rem;
    }

    .input-with-button {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .skill-input,
    .territory-input {
      flex: 1;
    }

    .add-button {
      margin-top: 0.25rem;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
    }

    .selected-items {
      background: white;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      font-weight: 600;
      color: #374151;
    }

    .clear-button {
      font-size: 0.8rem;
      padding: 0.25rem 0.75rem;
      min-height: auto;
      height: auto;
      line-height: 1.2;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .skill-chip,
    .territory-chip {
      font-size: 0.85rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #6b7280;
    }

    .empty-state mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #d1d5db;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.9rem;
    }

    /* Bottom Actions */
    .bottom-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      margin-top: 2rem;
    }

    .cancel-bottom {
      color: #6b7280;
      border-color: #d1d5db;
    }

    .save-bottom {
      padding: 0 2rem;
      font-weight: 600;
    }

    /* Error Message */
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #dc2626;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .hero-content {
        flex-direction: column;
        gap: 1rem;
      }

      .hero-actions {
        width: 100%;
        justify-content: stretch;
      }

      .hero-actions button {
        flex: 1;
      }

      .form-grid {
        grid-template-columns: 1fr;
        padding: 1.5rem;
      }

      .progress-steps {
        flex-direction: column;
        gap: 1rem;
      }

      .step {
        flex-direction: row;
        gap: 1rem;
      }

      .step-divider {
        display: none;
      }

      .bottom-actions {
        flex-direction: column;
      }

      .bottom-actions button {
        width: 100%;
      }
    }

    /* Animation */
    .form-section {
      animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .role-card,
    .status-option {
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `]
})
export class UserFormComponent implements OnInit {
  protected readonly userService = inject(UserManagementService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Component state
  public readonly isEditMode = signal<boolean>(false);
  public readonly currentUser = signal<User | null>(null);
  public readonly selectedSkills = signal<string[]>([]);
  public readonly selectedTerritories = signal<string[]>([]);
  public readonly availableManagers = signal<User[]>([]);
  
  // Step management
  public readonly currentStep = signal<number>(1);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly totalSteps = 4;
  public readonly stepTitles = [
    'Основная информация',
    'Роли и статус', 
    'Рабочие настройки',
    'Навыки и территории'
  ];

  // Form
  public userForm: FormGroup;

  // Static data
  public readonly availableRoles = [
    { value: 'admin', label: 'Администратор' },
    { value: 'sales_manager', label: 'Менеджер продаж' },
    { value: 'senior_manager', label: 'Старший менеджер' },
    { value: 'team_lead', label: 'Руководитель команды' },
    { value: 'account_manager', label: 'Менеджер аккаунтов' },
    { value: 'client', label: 'Клиент' }
  ];

  public readonly availableDepartments = [
    'Продажи', 'Маркетинг', 'IT', 'HR', 'Финансы', 'Поддержка клиентов'
  ];

  public readonly availableSkills = [
    // Продажи и переговоры
    'B2B продажи', 'B2C продажи', 'Переговоры', 'Презентации',
    'Холодные звонки', 'Теплые звонки', 'Закрытие сделок', 'Работа с возражениями',
    
    // Маркетинг и продвижение
    'Email маркетинг', 'SMM маркетинг', 'Контент маркетинг', 'SEO оптимизация',
    'Таргетированная реклама', 'Event маркетинг', 'Партнерский маркетинг',
    
    // Технические навыки
    'CRM системы', 'Анализ данных', 'Excel/Google Sheets', 'SQL запросы',
    'Управление проектами', 'Agile/Scrum', 'Бизнес-аналитика', 'Автоматизация процессов',
    
    // Отраслевая экспертиза
    'IT и телеком', 'Финансовые услуги', 'Производство', 'Логистика',
    'Недвижимость', 'Образование', 'Здравоохранение', 'E-commerce',
    'Retail и торговля', 'Консалтинг', 'Государственный сектор',
    
    // Управленческие навыки
    'Управление командой', 'Коучинг и менторинг', 'Стратегическое планирование',
    'Управление бюджетом', 'Обучение персонала', 'Постановка KPI',
    
    // Клиентский сервис
    'Обслуживание клиентов', 'Решение конфликтов', 'Техническая поддержка',
    'Консультирование', 'Работа с жалобами', 'Retention маркетинг',
    
    // Языковые навыки
    'Английский язык', 'Немецкий язык', 'Французский язык', 'Китайский язык',
    'Испанский язык', 'Итальянский язык'
  ];

  public readonly availableTerritories = [
    // Центральный федеральный округ
    'Москва', 'Московская область', 'Тула', 'Калуга', 'Рязань', 'Смоленск',
    'Тверь', 'Ярославль', 'Владимир', 'Иваново', 'Кострома', 'Орел',
    
    // Северо-Западный федеральный округ
    'Санкт-Петербург', 'Ленинградская область', 'Калининград', 'Мурманск',
    'Архангельск', 'Великий Новгород', 'Псков', 'Петрозаводск', 'Сыктывкар',
    
    // Южный федеральный округ
    'Ростов-на-Дону', 'Краснодар', 'Волгоград', 'Астрахань', 'Адыгея',
    'Калмыкия', 'Крым', 'Севастополь',
    
    // Приволжский федеральный округ
    'Нижний Новгород', 'Казань', 'Самара', 'Уфа', 'Пермь', 'Саратов',
    'Ижевск', 'Ульяновск', 'Чебоксары', 'Йошкар-Ола', 'Саранск', 'Пенза',
    'Кирин', 'Оренбург',
    
    // Уральский федеральный округ
    'Екатеринбург', 'Челябинск', 'Уфа', 'Курган', 'Тюмень', 'Ханты-Мансийск',
    'Салехард', 'Сургут', 'Нижневартовск',
    
    // Сибирский федеральный округ
    'Новосибирск', 'Омск', 'Красноярск', 'Барнаул', 'Иркутск', 'Кемерово',
    'Томск', 'Чита', 'Улан-Удэ', 'Абакан', 'Кызыл', 'Горно-Алтайск',
    
    // Дальневосточный федеральный округ
    'Владивосток', 'Хабаровск', 'Благовещенск', 'Магадан', 'Южно-Сахалинск',
    'Петропавловск-Камчатский', 'Якутск', 'Анадырь', 'Биробиджан',
    
    // Северо-Кавказский федеральный округ
    'Пятигорск', 'Ставрополь', 'Нальчик', 'Черкесск', 'Элиста', 'Махачкала',
    'Грозный', 'Назрань', 'Владикавказ', 'Майкоп',
    
    // Международные регионы
    'Беларусь', 'Казахстан', 'Киргизия', 'Таджикистан', 'Узбекистан',
    'Армения', 'Азербайджан', 'Грузия'
  ];

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

  private createForm(): FormGroup {
    const formConfig: any = {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      firstName: [''],
      lastName: [''],
      phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      department: [''],
      roles: [[], [Validators.required]],
      maxLeadsCapacity: [15],
      managerID: [''],
      isActive: [true],
      isAvailableForAssignment: [true]
    };

    // Add password fields only for create mode
    if (!this.isEditMode()) {
      formConfig.password = ['', [Validators.required, Validators.minLength(6)]];
      formConfig.confirmPassword = ['', [Validators.required]];
    }

    const form = this.fb.group(formConfig);

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

  // Role management
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
    const descriptions: Record<string, string> = {
      'admin': 'Полный доступ ко всем функциям системы',
      'sales_manager': 'Управление продажами и клиентами',
      'senior_manager': 'Старший менеджер с расширенными правами',
      'team_lead': 'Руководство командой и распределение задач',
      'account_manager': 'Управление ключевыми клиентами',
      'client': 'Ограниченный доступ для клиентов'
    };
    return descriptions[role] || 'Стандартная роль пользователя';
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

  // Step navigation methods
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
      case 1: // Basic Information
        const username = this.userForm.get('username');
        const email = this.userForm.get('email');
        const fullName = this.userForm.get('fullName');
        
        return !!(username?.valid && username?.value?.trim() && 
                 email?.valid && email?.value?.trim() &&
                 fullName?.valid && fullName?.value?.trim());
                 
      case 2: // Roles and Status
        const roles = this.userForm.get('roles')?.value;
        return !!(roles && Array.isArray(roles) && roles.length > 0);
        
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

  // Skills management
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

  // Territories management
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

  // Form actions
  save(): void {
    if (this.userForm.valid && !this.isSubmitting()) {
      const formData = this.userForm.value;
      
      // Add skills and territories
      formData.skills = this.selectedSkills();
      formData.territories = this.selectedTerritories();

      if (this.isEditMode()) {
        this.updateUser(formData);
      } else {
        this.createUser(formData);
      }
    }
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

  goBack(): void {
    this.router.navigate(['/users']);
  }

  // Utility methods
  formatLabel(value: number): string {
    return `${value}`;
  }
}