import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'user',
    renderMode: RenderMode.Client
  },
  {
    path: 'task-categories',
    renderMode: RenderMode.Client
  },
  {
    path: 'task-types',
    renderMode: RenderMode.Client
  },
  {
    path: 'tasks',
    renderMode: RenderMode.Client
  },
  {
    path: 'timetables',
    renderMode: RenderMode.Client
  },
  {
    path: 'users',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Client
  },
  // Fallback
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
