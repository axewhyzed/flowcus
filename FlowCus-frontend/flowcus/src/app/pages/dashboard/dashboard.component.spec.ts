import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { TaskService } from '../../core/services/task.service';
import { TimetableService } from '../../core/services/timetable.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ActiveBlockService } from '../../core/services/active-block.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats } from '../../core/models/dashboard.model';

describe('DashboardComponent', () => {
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let authService: { user: { id: number } };
  const baseStats: DashboardStats = {
    userName: 'Mihir',
    isAdmin: false,
    pendingTasks: 0,
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    dailyAvg: '0h',
    streakDays: 0,
    totalCategories: 0,
    todayTasks: [],
    todayTimetable: []
  };

  function createComponent(): DashboardComponent {
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']);
    return new DashboardComponent(
      dashboardService,
      {} as TaskService,
      {} as TimetableService,
      toast,
      {} as ConfirmService,
      {} as any,
      {} as ActiveBlockService,
      authService as unknown as AuthService
    );
  }

  beforeEach(() => {
    sessionStorage.clear();
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['getDashboardStats', 'getCurrentFocus']);
    dashboardService.getDashboardStats.and.returnValue(Promise.resolve(baseStats));
    authService = { user: { id: 6 } };
  });

  it('loads current focus separately from dashboard statistics', async () => {
    dashboardService.getCurrentFocus.and.returnValue(Promise.resolve({ taskName: 'Deep work' }));
    const component = createComponent();

    await component.loadDashboard();

    expect(dashboardService.getCurrentFocus).toHaveBeenCalled();
    expect(component.dashboardData?.currentFocus?.taskName).toBe('Deep work');
  });

  it('preserves dashboard statistics when the current-focus request fails', async () => {
    dashboardService.getCurrentFocus.and.returnValue(Promise.reject(new Error('Network error')));
    const component = createComponent();

    await component.loadDashboard();

    expect(component.dashboardData?.userName).toBe('Mihir');
    expect(component.currentFocusLoadFailed).toBeTrue();
  });

  it('shows a retryable dashboard error state when statistics fail to load', async () => {
    dashboardService.getDashboardStats.and.returnValue(Promise.reject(new Error('Network error')));
    dashboardService.getCurrentFocus.and.returnValue(Promise.resolve(null));
    const component = createComponent();

    await component.loadDashboard();

    expect(component.dashboardData).toBeNull();
    expect(component.dashboardLoading).toBeFalse();
    expect(component.dashboardLoadFailed).toBeTrue();
  });

  it('uses the backend completed-task and streak metric names in its response contract', async () => {
    dashboardService.getDashboardStats.and.returnValue(Promise.resolve({
      ...baseStats,
      completedTasks: 4,
      streakDays: 2
    }));
    dashboardService.getCurrentFocus.and.returnValue(Promise.resolve(null));
    const component = createComponent();

    await component.loadDashboard();

    expect(component.dashboardData?.completedTasks).toBe(4);
    expect(component.dashboardData?.streakDays).toBe(2);
  });

  it('persists a running focus timer before dashboard navigation destroys the component', () => {
    const component = createComponent();
    component.startFocusSession(25, 'Writing');

    component.ngOnDestroy();

    const saved = JSON.parse(sessionStorage.getItem('flowcus_focus_session_6')!);
    expect(saved.isTimerRunning).toBeTrue();
    expect(saved.timerTitle).toBe('Writing');
    expect(saved.timerEndAt).toBeGreaterThan(Date.now());
  });
});
