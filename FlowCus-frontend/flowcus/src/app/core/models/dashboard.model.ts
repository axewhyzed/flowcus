export interface DashboardTask {
  taskId: number;
  title: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  priority?: number | null;
  isCompleted: boolean;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
}

export interface DashboardTimetableItem {
  id: number;
  startTime: string;
  endTime: string;
  categoryName: string;
  taskName?: string;
  title?: string;
  subtypeName?: string | null;
  colorHex?: string | null;
}

export interface DashboardStats {
  userName: string;
  isAdmin: boolean;
  pendingTasks: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  dailyAvg: string;
  /** Consecutive local calendar days with completed tasks, as returned by the API. */
  streakDays: number;
  totalCategories: number;
  todayTasks: DashboardTask[];
  todayTimetable: DashboardTimetableItem[];
}

export interface DashboardCurrentFocus {
  taskName?: string | null;
  taskCategoryId?: number | null;
  categoryName?: string | null;
  subtypeName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface DashboardData extends DashboardStats {
  currentFocus: DashboardCurrentFocus | null;
}
