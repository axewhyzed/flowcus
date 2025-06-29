import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Default redirect to dashboard
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },

  // Dashboard route
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent),
    title: 'Dashboard - FlowCus',
    data: { breadcrumb: 'Dashboard' }
  },

  // Task management routes
  {
    path: 'tasks',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/tasks/task-list/task-list.component').then(c => c.TaskListComponent),
        title: 'Tasks - FlowCus',
        data: { breadcrumb: 'Tasks' }
      },
      {
        path: 'create',
        loadComponent: () => import('./features/tasks/task-form/task-form.component').then(c => c.TaskFormComponent),
        title: 'Create Task - FlowCus',
        data: { breadcrumb: 'Create Task' }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./features/tasks/task-form/task-form.component').then(c => c.TaskFormComponent),
        title: 'Edit Task - FlowCus',
        data: { breadcrumb: 'Edit Task' }
      }
    ]
  },

  // Template management routes
  {
    path: 'templates',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/templates/template-list/template-list.component').then(c => c.TemplateListComponent),
        title: 'Templates - FlowCus',
        data: { breadcrumb: 'Templates' }
      },
      {
        path: 'create',
        loadComponent: () => import('./features/templates/template-form/template-form.component').then(c => c.TemplateFormComponent),
        title: 'Create Template - FlowCus',
        data: { breadcrumb: 'Create Template' }
      },
      {
        path: ':id',
        loadComponent: () => import('./features/templates/template-detail/template-detail.component').then(c => c.TemplateDetailComponent),
        title: 'Template Details - FlowCus',
        data: { breadcrumb: 'Template Details' }
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/templates/template-form/template-form.component').then(c => c.TemplateFormComponent),
        title: 'Edit Template - FlowCus',
        data: { breadcrumb: 'Edit Template' }
      },
      {
        path: ':id/items',
        loadComponent: () => import('./features/templates/template-item-form/template-item-form.component').then(c => c.TemplateItemFormComponent),
        title: 'Template Items - FlowCus',
        data: { breadcrumb: 'Template Items' }
      }
    ]
  },

  // // Settings and profile routes (future implementation)
  // {
  //   path: 'settings',
  //   loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent),
  //   title: 'Settings - FlowCus',
  //   data: { breadcrumb: 'Settings' },
  //   canActivate: [AuthGuard] // Protect settings with auth guard
  // },

  // // Profile route (future implementation)
  // {
  //   path: 'profile',
  //   loadComponent: () => import('./features/profile/profile.component').then(c => c.ProfileComponent),
  //   title: 'Profile - FlowCus',
  //   data: { breadcrumb: 'Profile' },
  //   canActivate: [AuthGuard]
  // },

  // Authentication routes (future implementation)
  // {
  //   path: 'auth',
  //   children: [
  //     {
  //       path: 'login',
  //       loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent),
  //       title: 'Login - FlowCus'
  //     },
  //     {
  //       path: 'register',
  //       loadComponent: () => import('./features/auth/register/register.component').then(c => c.RegisterComponent),
  //       title: 'Register - FlowCus'
  //     },
  //     {
  //       path: 'forgot-password',
  //       loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent),
  //       title: 'Forgot Password - FlowCus'
  //     }
  //   ]
  // },

  // Error routes
  {
    path: '404',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(c => c.NotFoundComponent),
    title: 'Page Not Found - FlowCus'
  },

  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: '/404'
  }
];
