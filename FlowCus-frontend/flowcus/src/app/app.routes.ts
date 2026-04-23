import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

// Pages
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { LoginPage } from './pages/auth/login.page';
import { UserPage } from './pages/user/user.page';
import { TaskCategoryPage } from './pages/task-category/task-category.page';
import { TaskPage } from './pages/task/task.page';
import { TimetablePage } from './pages/timetable/timetable.page';
import { TaskTypesPage } from './pages/task-types/task-types.page';
import { UserManagementComponent } from './pages/user-management/user-management.page';

export const routes: Routes = [
  // 1. Public Routes (No Layout, No Guard)
  { path: 'login', component: LoginPage },

  // 2. Protected Routes (Wrapped in MainLayout)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard], // Guard applies to all children
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardPage },
      { path: 'user', component: UserPage },
      { path: 'task-categories', component: TaskCategoryPage },
      { path: 'tasks', component: TaskPage },
      { path: 'timetables', component: TimetablePage },
      { path: 'task-types', component: TaskTypesPage },
      { path: 'users', component: UserManagementComponent, canActivate: [AdminGuard] },
    ]
  },

  // 3. Wildcard
  { path: '**', redirectTo: '/dashboard' }
];