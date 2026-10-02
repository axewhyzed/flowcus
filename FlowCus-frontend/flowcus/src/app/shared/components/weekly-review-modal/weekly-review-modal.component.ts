import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyRitualService } from '../../../core/services/daily-ritual.service';
import { TaskService } from '../../../core/services/task.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { SoundFeedbackService } from '../../../core/services/sound-feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { Task } from '../../../core/models/task.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-weekly-review-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        (click)="close()">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                <i class="fa-solid fa-chart-line text-emerald-600"></i>
              </div>
              <div>
                <h2 class="text-sm font-semibold text-slate-900 tracking-tight">Weekly Retrospective</h2>
                <p class="text-[11px] text-slate-500">Celebrate wins and calibrate your upcoming week</p>
              </div>
            </div>
            <button (click)="close()" class="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <!-- 3 Stat KPI Cards -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-center">
                <span class="text-xl font-bold text-slate-900 font-mono">{{ completedTasksCount }}</span>
                <span class="text-[10px] text-slate-500 block uppercase tracking-wider mt-0.5">Tasks Done</span>
              </div>
              <div class="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/60 text-center">
                <span class="text-xl font-bold text-emerald-800 font-mono">{{ completionRate }}%</span>
                <span class="text-[10px] text-emerald-600 block uppercase tracking-wider mt-0.5">Completion</span>
              </div>
              <div class="bg-sky-50/60 rounded-xl p-3 border border-sky-200/60 text-center">
                <span class="text-xl font-bold text-sky-800 font-mono">{{ totalPlannedHours }}h</span>
                <span class="text-[10px] text-sky-600 block uppercase tracking-wider mt-0.5">Time Boxed</span>
              </div>
            </div>

            <!-- Insights Box -->
            <div class="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <h4 class="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <i class="fa-solid fa-sparkles text-amber-500"></i>
                <span>Weekly Execution Insights</span>
              </h4>
              <ul class="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>You completed <strong>{{ completedTasksCount }}</strong> tasks with an overall <strong>{{ completionRate }}%</strong> execution rate.</li>
                <li>Your active weekly timetable allocated <strong>{{ totalPlannedHours }} hours</strong> across your key life taxonomies.</li>
                <li>Zero-guilt rollovers kept your backlog healthy without chronic overdue anxiety.</li>
              </ul>
            </div>

            <!-- Next Week Action -->
            <div class="border border-slate-200/80 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <h4 class="text-xs font-semibold text-slate-900">Prepare Next Week's Timetable</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">Keep current schedule or switch routine templates</p>
              </div>
              <button (click)="goToTimetables()"
                class="h-8 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
                <span>Timetables</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
            <button (click)="close()"
              class="h-8 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-2xs">
              Close Review
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class WeeklyReviewModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  completedTasksCount = 0;
  completionRate = 0;
  totalPlannedHours = 24;

  private sub = new Subscription();

  constructor(
    private ritualService: DailyRitualService,
    private taskService: TaskService,
    private timetableService: TimetableService,
    private soundService: SoundFeedbackService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.ritualService.weeklyReviewModal$.subscribe((open) => {
        this.isOpen = open;
        if (open) {
          this.loadStats();
        }
      })
    );
  }

  private async loadStats(): Promise<void> {
    try {
      const tasks = await this.taskService.getAll();
      const all = (tasks || []).filter(t => !t.isDeleted);
      const completed = all.filter(t => t.isCompleted);
      this.completedTasksCount = completed.length;
      this.completionRate = all.length > 0 ? Math.round((completed.length / all.length) * 100) : 100;
    } catch {
      this.completedTasksCount = 0;
      this.completionRate = 0;
    }
  }

  public goToTimetables(): void {
    this.close();
    this.router.navigate(['/timetables']);
  }

  public close(): void {
    this.ritualService.closeWeeklyReview();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
