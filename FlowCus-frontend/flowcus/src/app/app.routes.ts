import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  // 1. Public Routes (No Layout, No Guard)
  { 
    path: 'login', 
    loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent) 
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
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'user', 
        loadComponent: () => import('./pages/user/user-profile.component').then(m => m.UserProfileComponent) 
      },
      { 
        path: 'task-categories', 
        redirectTo: 'task-types', 
        pathMatch: 'full' 
      },
      { 
        path: 'task-types', 
        loadComponent: () => import('./pages/task-types/task-types.component').then(m => m.TaskTypesComponent) 
      },
      { 
        path: 'tasks', 
        loadComponent: () => import('./pages/tasks/tasks.component').then(m => m.TasksComponent) 
      },
      { 
        path: 'timetables', 
        loadComponent: () => import('./pages/timetables/timetables.component').then(m => m.TimetablesComponent) 
      },
      { 
        path: 'users', 
        loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent), 
        canActivate: [AdminGuard] 
      },
    ]
  },

  // 3. Wildcard
  { path: '**', redirectTo: '/dashboard' }
];