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
    path: 'tasks',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'templates',
    renderMode: RenderMode.Prerender
  },

  // dynamic routes should be client only:
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

  // fallback
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
