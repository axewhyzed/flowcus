import { RenderMode, ServerRoute } from '@angular/ssr';
import { AuthGuard } from './core/guards/auth.guard';

import { DashboardPage } from './pages/dashboard/dashboard.page';
import { LoginPage } from './pages/auth/login.page';
import { UserPage } from './pages/user/user.page';
import { TaskCategoryPage } from './pages/task-category/task-category.page';
import { TaskSubtypePage } from './pages/task-subtype/task-subtype.page';
import { TaskPage } from './pages/task/task.page';
import { TimetablePage } from './pages/timetable/timetable.page';
import { TimetableItemPage } from './pages/timetable-item/timetable-item.page';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'user',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'task-categories',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'task-subtypes',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'tasks',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'task-types',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'timetables',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'timetable-items',
    renderMode: RenderMode.Prerender
  },

  // Dynamic routes that should be client only
  {
    path: 'tasks/edit/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'templates/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'templates/:id/edit',
    renderMode: RenderMode.Client
  },
  {
    path: 'templates/:id/items',
    renderMode: RenderMode.Client
  },

  // Fallback
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
