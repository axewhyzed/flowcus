import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  // 1. Public Routes (No Layout, No Guard)
  { 
    path: 'login', 
    loadComponent: () => import('./pages/auth/login.page').then(m => m.LoginPage) 
  },

  // 2. Protected Routes (Wrapped in MainLayout)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage) 
      },
      { 
        path: 'user', 
        loadComponent: () => import('./pages/user/user.page').then(m => m.UserPage) 
      },
      { 
        path: 'task-categories', 
        redirectTo: 'task-types', 
        pathMatch: 'full' 
      },
      { 
        path: 'task-types', 
        loadComponent: () => import('./pages/task-types/task-types.page').then(m => m.TaskTypesPage) 
      },
      { 
        path: 'tasks', 
        loadComponent: () => import('./pages/task/task.page').then(m => m.TaskPage) 
      },
      { 
        path: 'timetables', 
        loadComponent: () => import('./pages/timetable/timetable.page').then(m => m.TimetablePage) 
      },
      { 
        path: 'users', 
        loadComponent: () => import('./pages/user-management/user-management.page').then(m => m.UserManagementComponent), 
        canActivate: [AdminGuard] 
      },
    ]
  },

  // 3. Wildcard
  { path: '**', redirectTo: '/dashboard' }
];