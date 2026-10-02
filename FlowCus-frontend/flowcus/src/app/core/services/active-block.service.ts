import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { TimetableService } from './timetable.service';
import { TimetableItemService } from './timetable-item.service';
import { TaskCategoryService } from './task-category.service';
import { TaskSubtypeService } from './task-subtype.service';
import { AuthService } from './auth.service';
import { TimetableItem } from '../models/timetable-item.model';
import { TaskCategory } from '../models/task-category.model';
import { TaskSubtype } from '../models/task-subtype.model';

export interface ActiveBlockInfo {
  id: number;
  taskCategoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  subtypeName?: string;
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
  startFormatted: string; // "9:00 AM"
  endFormatted: string;   // "11:00 AM"
  totalMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  formattedRemaining: string; // "45m" or "1h 15m"
  progressPercent: number; // 0 - 100
}

export interface UpcomingBlockInfo {
  id: number;
  taskCategoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  subtypeName?: string;
  startTime: string;
  startFormatted: string;
  startsInMinutes: number;
  formattedStartsIn: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActiveBlockService implements OnDestroy {
  private activeBlockSubject = new BehaviorSubject<ActiveBlockInfo | null>(null);
  public activeBlock$: Observable<ActiveBlockInfo | null> = this.activeBlockSubject.asObservable();

  private upcomingBlockSubject = new BehaviorSubject<UpcomingBlockInfo | null>(null);
  public upcomingBlock$: Observable<UpcomingBlockInfo | null> = this.upcomingBlockSubject.asObservable();

  private isFocusModeOpenSubject = new BehaviorSubject<boolean>(false);
  public isFocusModeOpen$: Observable<boolean> = this.isFocusModeOpenSubject.asObservable();

  private timerSub?: Subscription;
  private authSub?: Subscription;
  private categories: TaskCategory[] = [];
  private subtypes: TaskSubtype[] = [];
  private todayItems: TimetableItem[] = [];

  constructor(
    private timetableService: TimetableService,
    private timetableItemService: TimetableItemService,
    private categoryService: TaskCategoryService,
    private subtypeService: TaskSubtypeService,
    private authService: AuthService
  ) {
    this.init();
  }

  private init(): void {
    this.authSub = this.authService.isAuthenticated$.subscribe((isAuth) => {
      if (isAuth) {
        this.loadData();
      } else {
        this.categories = [];
        this.subtypes = [];
        this.todayItems = [];
        this.activeBlockSubject.next(null);
        this.upcomingBlockSubject.next(null);
      }
    });

    // Poll time calculation every 10 seconds
    this.timerSub = interval(10000).subscribe(() => {
      if (this.authService.isAuthenticated) {
        this.computeActiveBlock();
      }
    });
  }

  public async loadData(): Promise<void> {
    if (!this.authService.isAuthenticated) {
      return;
    }

    try {
      const [cats, subs] = await Promise.all([
        this.categoryService.getAll().catch(() => []),
        this.subtypeService.getAll().catch(() => [])
      ]);
      this.categories = (cats as TaskCategory[]) || [];
      this.subtypes = (subs as TaskSubtype[]) || [];
    } catch {
      this.categories = [];
      this.subtypes = [];
    }
    await this.loadActiveTimetableItems();
  }

  private async loadActiveTimetableItems(): Promise<void> {
    try {
      const timetables = await this.timetableService.getAll();
      const active = timetables?.find(t => t.isActive) || timetables?.[0];
      if (active) {
        const items = await this.timetableItemService.getItems(active.id);
        const todayDayIndex = new Date().getDay();
        this.todayItems = (items || []).filter(i => !i.isDeleted && i.dayOfWeek === todayDayIndex);
      } else {
        this.todayItems = [];
      }
    } catch {
      this.todayItems = [];
    }
    this.computeActiveBlock();
  }

  public computeActiveBlock(): void {
    if (!this.todayItems || this.todayItems.length === 0) {
      this.activeBlockSubject.next(null);
      this.upcomingBlockSubject.next(null);
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let current: ActiveBlockInfo | null = null;
    let upcoming: UpcomingBlockInfo | null = null;
    let minUpcomingDiff = Infinity;

    for (const item of this.todayItems) {
      const startMin = this.timeStringToMinutes(item.startTime);
      const endMin = this.timeStringToMinutes(item.endTime);

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        const total = Math.max(1, endMin - startMin);
        const elapsed = currentMinutes - startMin;
        const remaining = endMin - currentMinutes;
        const progress = Math.min(100, Math.round((elapsed / total) * 100));

        const cat = this.categories.find(c => c.id === item.taskCategoryId);
        const sub = this.subtypes.find(s => s.id === item.taskSubtypeId);

        current = {
          id: item.id,
          taskCategoryId: item.taskCategoryId,
          categoryName: cat?.name || item.taskName || 'Scheduled Block',
          categoryColor: cat?.colorHex || '#3b82f6',
          categoryIcon: cat?.iconName || 'fa-solid fa-shapes',
          subtypeName: sub?.name,
          startTime: item.startTime.substring(0, 5),
          endTime: item.endTime.substring(0, 5),
          startFormatted: this.to12Hour(item.startTime),
          endFormatted: this.to12Hour(item.endTime),
          totalMinutes: total,
          elapsedMinutes: elapsed,
          remainingMinutes: remaining,
          formattedRemaining: this.formatDuration(remaining),
          progressPercent: progress
        };
      } else if (startMin > currentMinutes) {
        const diff = startMin - currentMinutes;
        if (diff < minUpcomingDiff) {
          minUpcomingDiff = diff;
          const cat = this.categories.find(c => c.id === item.taskCategoryId);
          const sub = this.subtypes.find(s => s.id === item.taskSubtypeId);
          upcoming = {
            id: item.id,
            taskCategoryId: item.taskCategoryId,
            categoryName: cat?.name || item.taskName || 'Scheduled Block',
            categoryColor: cat?.colorHex || '#3b82f6',
            categoryIcon: cat?.iconName || 'fa-solid fa-shapes',
            subtypeName: sub?.name,
            startTime: item.startTime.substring(0, 5),
            startFormatted: this.to12Hour(item.startTime),
            startsInMinutes: diff,
            formattedStartsIn: this.formatDuration(diff)
          };
        }
      }
    }

    this.activeBlockSubject.next(current);
    this.upcomingBlockSubject.next(upcoming);
  }

  public openFocusMode(): void {
    this.isFocusModeOpenSubject.next(true);
  }

  public closeFocusMode(): void {
    this.isFocusModeOpenSubject.next(false);
  }

  public toggleFocusMode(): void {
    this.isFocusModeOpenSubject.next(!this.isFocusModeOpenSubject.value);
  }

  private timeStringToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  private to12Hour(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  private formatDuration(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.authSub?.unsubscribe();
  }
}
