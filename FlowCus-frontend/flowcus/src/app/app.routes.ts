import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

import { DashboardPage } from './pages/dashboard/dashboard.page';
import { LoginPage } from './pages/auth/login.page';
import { UserPage } from './pages/user/user.page';
import { TaskCategoryPage } from './pages/task-category/task-category.page';
import { TaskSubtypePage } from './pages/task-subtype/task-subtype.page';
import { TaskPage } from './pages/task/task.page';
import { TimetablePage } from './pages/timetable/timetable.page';
import { TimetableItemPage } from './pages/timetable-item/timetable-item.page';
import { TaskTypesPage } from './pages/task-types/task-types.page';
import { UserManagementComponent } from './pages/user-management/user-management.page';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: DashboardPage, canActivate: [AuthGuard] },
  { path: 'login', component: LoginPage },
  { path: 'user', component: UserPage, canActivate: [AuthGuard] },

  { path: 'task-categories', component: TaskCategoryPage, canActivate: [AuthGuard] },
  { path: 'task-subtypes', component: TaskSubtypePage, canActivate: [AuthGuard] },
  { path: 'tasks', component: TaskPage, canActivate: [AuthGuard] },

  { path: 'timetables', component: TimetablePage, canActivate: [AuthGuard] },
  { path: 'timetable-items', component: TimetableItemPage, canActivate: [AuthGuard] },
  { path: 'task-types', component: TaskTypesPage, canActivate: [AuthGuard] },

  { path: 'admin/users', component: UserManagementComponent, canActivate: [AuthGuard] },

  { path: '**', redirectTo: '/dashboard' }
];
