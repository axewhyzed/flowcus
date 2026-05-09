import { RenderMode, ServerRoute } from '@angular/ssr';

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
  // Admin page
  {
    path: 'admin/users',
    renderMode: RenderMode.Client
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
