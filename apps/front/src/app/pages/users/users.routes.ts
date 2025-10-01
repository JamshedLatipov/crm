import { Routes } from '@angular/router';
import { UsersComponent } from './users.component';
import { UserListComponent } from './user-list/user-list.component';
import { UserDetailComponent } from './user-detail.component';
import { UserFormComponent } from './user-form.component';

export const usersRoutes: Routes = [
  {
    path: '',
    component: UsersComponent,
    children: [
      {
        path: '',
        component: UserListComponent,
        title: 'Управление пользователями'
      },
      {
        path: 'create',
        component: UserFormComponent,
        title: 'Создание пользователя'
      },
      {
        path: ':id',
        component: UserDetailComponent,
        title: 'Пользователь'
      },
      {
        path: ':id/edit',
        component: UserFormComponent,
        title: 'Редактирование пользователя'
      }
    ]
  }
];