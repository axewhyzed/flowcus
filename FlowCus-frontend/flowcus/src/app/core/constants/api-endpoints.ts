// src/app/core/constants/api-endpoints.ts

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: 'auth/login',
    CHANGE_PASSWORD: 'auth/change-password',
    LOGOUT: 'auth/logout',
    ME: 'auth/me',
    CSRF: 'auth/csrf'
  },
  TASKS: 'tasks',
  TASK_CATEGORY: 'task-category',
  TASK_SUBTYPE: 'task-subtype',
  USERS: 'users',
  TIMETABLE: 'timetable',
  DASHBOARD: {
    STATS: 'dashboard/stats',
    NOW: 'dashboard/now'
  }
};
