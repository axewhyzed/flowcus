import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { DashboardService } from '../../core/services/dashboard.service';
import { TaskService } from '../../core/services/task.service';
import { TimetableService } from '../../core/services/timetable.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ActiveBlockService } from '../../core/services/active-block.service';
import { DailyRitualService } from '../../core/services/daily-ritual.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';
import { SoundFeedbackService } from '../../core/services/sound-feedback.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardData, DashboardTimetableItem } from '../../core/models/dashboard.model';

interface TimetableSlot {
  id: number;
  categoryName: string;
  subtypeName: string | null;
  startTime: string;
  endTime: string;
  displayTime?: string;
  displayTitle?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardData: DashboardData | null = null;
  dashboardLoading = true;
  dashboardLoadFailed = false;
  currentFocusLoadFailed = false;
  processedTimetable: TimetableSlot[] = [];
  todayDate: Date = new Date();

  // Focus Timer state
  isTimerRunning: boolean = false;
  isTimerActive: boolean = false;
  timerSecondsRemaining: number = 25 * 60;
  timerTotalSeconds: number = 25 * 60;
  timerTitle: string = 'Deep Work Session';
  private timerInterval: any = null;
  private timerEndAt: number | null = null;

  // Unfinished tasks rollover
  hasUnfinishedTasks: boolean = false;
  isRollingOver: boolean = false;

  constructor(
    private dashboardService: DashboardService,
    private taskService: TaskService,
    private timetableService: TimetableService,
    private toast: ToastService,
    private confirmService: ConfirmService,
    private router: Router,
    public activeBlockService: ActiveBlockService,
    public ritualService: DailyRitualService,
    public paletteService: CommandPaletteService,
    public soundService: SoundFeedbackService,
    private authService: AuthService
  ) { }

  openZenFocus(): void {
    this.activeBlockService.openFocusMode();
  }

  openMorningKickoff(): void {
    this.ritualService.openMorningKickoff();
  }

  openEveningShutdown(): void {
    this.ritualService.openEveningShutdown();
  }

  openWeeklyReview(): void {
    this.ritualService.openWeeklyReview();
  }

  get isMorningDone(): boolean {
    return this.ritualService.isMorningKickoffCompletedToday();
  }

  get isEveningDone(): boolean {
    return this.ritualService.isEveningShutdownCompletedToday();
  }

  ngOnInit(): void {
    this.restoreFocusSession();
    this.loadDashboard();
    this.checkUnfinishedTasks();
  }

  ngOnDestroy(): void {
    this.persistFocusSession();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  async loadDashboard() {
    this.dashboardLoading = true;
    this.dashboardLoadFailed = false;
    try {
      const [statsResult, focusResult] = await Promise.allSettled([
        this.dashboardService.getDashboardStats(),
        this.dashboardService.getCurrentFocus()
      ]);
      if (statsResult.status === 'rejected') throw statsResult.reason;
      this.currentFocusLoadFailed = focusResult.status === 'rejected';
      const currentFocus = focusResult.status === 'fulfilled' ? focusResult.value : null;
      this.dashboardData = {
        ...statsResult.value,
        currentFocus: currentFocus?.taskName ? currentFocus : null
      };
      if (this.dashboardData?.todayTimetable) {
        this.processedTimetable = this.processTimetableData(this.dashboardData.todayTimetable);
      } else {
        this.processedTimetable = [];
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.dashboardData = null;
      this.dashboardLoadFailed = true;
      this.currentFocusLoadFailed = false;
      this.processedTimetable = [];
    } finally {
      this.dashboardLoading = false;
    }
  }

  async checkUnfinishedTasks() {
    try {
      const tasks = await this.taskService.getAll();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pastUnfinished = (tasks || []).filter(t => {
        if (t.isCompleted || t.isDeleted) return false;
        if (t.startTime) {
          return new Date(t.startTime) < today;
        }
        return new Date(t.createdOn) < today;
      });
      this.hasUnfinishedTasks = pastUnfinished.length > 0;
    } catch {}
  }

  async rolloverUnfinishedTasks() {
    this.isRollingOver = true;
    try {
      const res = await this.taskService.rolloverYesterday();
      this.isRollingOver = false;
      this.hasUnfinishedTasks = false;
      this.toast.success(res?.message || 'Tasks rolled over to today!');
      await this.loadDashboard();
    } catch (err: any) {
      this.isRollingOver = false;
      this.toast.error('Failed to rollover tasks.');
    }
  }

  // --- 1-Tap Focus Timer Methods ---
  startFocusSession(minutes: number, title?: string) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerTotalSeconds = minutes * 60;
    this.timerSecondsRemaining = this.timerTotalSeconds;
    this.timerTitle = title || (this.dashboardData?.currentFocus?.taskName || 'Deep Work Session');
    this.isTimerActive = true;
    this.isTimerRunning = true;
    this.timerEndAt = Date.now() + this.timerTotalSeconds * 1000;
    this.runFocusTimer();
    this.persistFocusSession();

    this.toast.info(`Started ${minutes}m focus session: ${this.timerTitle}`);
  }

  pauseFocusSession() {
    this.isTimerRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.timerEndAt) {
      this.timerSecondsRemaining = Math.max(0, Math.ceil((this.timerEndAt - Date.now()) / 1000));
    }
    this.timerEndAt = null;
    this.persistFocusSession();
  }

  resumeFocusSession() {
    if (!this.isTimerActive) return;
    this.isTimerRunning = true;
    this.timerEndAt = Date.now() + this.timerSecondsRemaining * 1000;
    this.runFocusTimer();
    this.persistFocusSession();
  }

  async cancelFocusSession() {
    const confirmed = await this.confirmService.confirm({
      title: 'Cancel Focus Session',
      message: 'Are you sure you want to end this focus session early?',
      confirmText: 'End Session',
      danger: true
    });

    if (confirmed) {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.isTimerActive = false;
      this.isTimerRunning = false;
      this.timerEndAt = null;
      this.removeFocusSession();
      this.toast.info('Focus session cancelled.');
    }
  }

  async finishFocusSession() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const finishedTitle = this.timerTitle;
    const durationMinutes = Math.round(this.timerTotalSeconds / 60);
    this.isTimerRunning = false;
    this.isTimerActive = false;
    this.timerEndAt = null;
    this.removeFocusSession();

    // Auto-log task to backend as completed!
    try {
      await this.taskService.create({
        title: `Focus: ${finishedTitle}`,
        description: `Completed ${durationMinutes}m focus block`,
        isCompleted: true,
        taskCategoryId: this.dashboardData?.currentFocus?.taskCategoryId || 1
      });
      this.toast.success(`Great job! Completed focus session: ${finishedTitle}`);
      await this.loadDashboard();
    } catch {
      this.toast.error('Focus session ended, but it could not be saved. Please add it as a task manually.');
    }
  }

  get formattedTimer(): string {
    const mins = Math.floor(this.timerSecondsRemaining / 60);
    const secs = this.timerSecondsRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  get timerProgressPercent(): number {
    if (this.timerTotalSeconds === 0) return 0;
    return Math.round(((this.timerTotalSeconds - this.timerSecondsRemaining) / this.timerTotalSeconds) * 100);
  }

  // --- Schedule Shift Method ---
  async shiftToday(minutes: number) {
    try {
      const res = await this.timetableService.shiftToday(minutes, new Date().getDay());
      this.toast.success(res?.message || `Shifted today's schedule by +${minutes}m`);
      await this.activeBlockService.refresh();
      await this.loadDashboard();
    } catch (err) {
      this.toast.error('Failed to shift schedule.');
    }
  }

  async toggleTaskComplete(task: any) {
    const newStatus = !task.isCompleted;
    task.isCompleted = newStatus;
    try {
      await this.taskService.toggleComplete(task.taskId || task.id, newStatus);
      this.toast.success(newStatus ? 'Task completed! ✨' : 'Task marked active');
    } catch {
      task.isCompleted = !newStatus;
      this.toast.error('Failed to update task');
    }
  }

  processTimetableData(timetable: DashboardTimetableItem[]): TimetableSlot[] {
    return timetable.map(slot => ({
      ...slot,
      subtypeName: slot.subtypeName ?? null,
      displayTitle: slot.subtypeName
        ? `${slot.categoryName} - ${slot.subtypeName}`
        : slot.categoryName,
      displayTime: this.formatTimeRange(slot.startTime, slot.endTime)
    })).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  formatTimeRange(startTime: string, endTime: string): string {
    return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getCategoryColor(categoryName: string): string {
    const colors: { [key: string]: string } = {
      'Exercise': 'bg-green-50 border-green-200 text-green-700',
      'Study': 'bg-blue-50 border-blue-200 text-blue-700',
      'Work': 'bg-purple-50 border-purple-200 text-purple-700',
      'Meeting': 'bg-orange-50 border-orange-200 text-orange-700',
      'Personal': 'bg-pink-50 border-pink-200 text-pink-700',
      'Fitness': 'bg-emerald-50 border-emerald-200 text-emerald-700'
    };
    return colors[categoryName] || 'bg-gray-50 border-gray-200 text-gray-700';
  }

  getTimeIndicator(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  getPriorityBadgeClass(priority?: number | null): string {
    switch (priority) {
      case 1: return 'bg-rose-50 text-rose-700 border-rose-200';
      case 2: return 'bg-orange-50 text-orange-700 border-orange-200';
      case 3: return 'bg-amber-50 text-amber-700 border-amber-200';
      case 4: return 'bg-sky-50 text-sky-700 border-sky-200';
      case 5: return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const isEditable = target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag || '');
    const isInteractive = ['button', 'a', 'input', 'textarea', 'select'].includes(tag || '') || isEditable;
    if (isEditable || isInteractive) return;

    if (event.key.toLowerCase() === 'q' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.quickAddTask();
    } else if (event.code === 'Space') {
      event.preventDefault();
      if (!this.isTimerActive) {
        this.startFocusSession(25);
      } else {
        if (this.isTimerRunning) {
          this.pauseFocusSession();
        } else {
          this.resumeFocusSession();
        }
      }
    } else if (event.key === 'Escape' && this.isTimerActive) {
      event.preventDefault();
      this.cancelFocusSession();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && this.isTimerActive) {
      event.preventDefault();
      this.finishFocusSession();
    }
  }

  quickAddTask() {
    this.router.navigate(['/tasks'], { queryParams: { action: 'quick' } });
  }

  goToTimetables() {
    this.router.navigate(['/timetables']);
  }

  private runFocusTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSecondsRemaining = this.timerEndAt
        ? Math.max(0, Math.ceil((this.timerEndAt - Date.now()) / 1000))
        : this.timerSecondsRemaining;
      if (this.timerSecondsRemaining <= 0) {
        void this.finishFocusSession();
      }
    }, 1000);
  }

  private focusSessionStorageKey(): string {
    return `flowcus_focus_session_${this.authService.user?.id ?? 'anonymous'}`;
  }

  private persistFocusSession(): void {
    if (typeof sessionStorage === 'undefined' || !this.isTimerActive) return;
    try {
      sessionStorage.setItem(this.focusSessionStorageKey(), JSON.stringify({
        isTimerRunning: this.isTimerRunning,
        timerSecondsRemaining: this.timerSecondsRemaining,
        timerTotalSeconds: this.timerTotalSeconds,
        timerTitle: this.timerTitle,
        timerEndAt: this.timerEndAt
      }));
    } catch {
      // The timer still works while the browser blocks session storage.
    }
  }

  private restoreFocusSession(): void {
    if (typeof sessionStorage === 'undefined') return;
    let saved: string | null;
    try {
      saved = sessionStorage.getItem(this.focusSessionStorageKey());
    } catch {
      return;
    }
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      if (!Number.isFinite(state.timerTotalSeconds) || !Number.isFinite(state.timerSecondsRemaining)) {
        this.removeFocusSession();
        return;
      }
      this.isTimerActive = true;
      this.isTimerRunning = !!state.isTimerRunning;
      this.timerTotalSeconds = state.timerTotalSeconds;
      this.timerTitle = typeof state.timerTitle === 'string' ? state.timerTitle : 'Deep Work Session';
      this.timerEndAt = this.isTimerRunning && Number.isFinite(state.timerEndAt) ? state.timerEndAt : null;
      this.timerSecondsRemaining = this.timerEndAt
        ? Math.max(0, Math.ceil((this.timerEndAt - Date.now()) / 1000))
        : state.timerSecondsRemaining;
      if (this.isTimerRunning) {
        if (this.timerSecondsRemaining === 0) void this.finishFocusSession();
        else this.runFocusTimer();
      }
    } catch {
      this.removeFocusSession();
    }
  }

  private removeFocusSession(): void {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(this.focusSessionStorageKey());
    } catch {
      // The user can still complete or cancel a timer when storage is unavailable.
    }
  }
}
