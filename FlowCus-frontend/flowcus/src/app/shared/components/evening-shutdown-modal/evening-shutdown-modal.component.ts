import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyRitualService } from '../../../core/services/daily-ritual.service';
import { TaskService } from '../../../core/services/task.service';
import { SoundFeedbackService } from '../../../core/services/sound-feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { Task } from '../../../core/models/task.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-evening-shutdown-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        (click)="close()">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                <i class="fa-solid fa-moon text-indigo-600"></i>
              </div>
              <div>
                <h2 class="text-sm font-semibold text-slate-900 tracking-tight">Evening Shutdown Ritual</h2>
                <p class="text-[11px] text-slate-500">Close open loops and disconnect with peace of mind</p>
              </div>
            </div>
            <button (click)="close()" class="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <!-- Wins Snapshot -->
            <div class="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-indigo-950">Daily Progress</span>
                <p class="text-[11px] text-indigo-700 mt-0.5">Celebrate today's execution wins</p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-bold text-indigo-900 font-mono">{{ completedToday.length }}</span>
                <span class="text-[10px] text-indigo-500 block uppercase tracking-wider">Completed</span>
              </div>
            </div>

            <!-- Unfinished Tasks Triage -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Unfinished Tasks ({{ unfinishedTasks.length }})
                </span>
                @if (unfinishedTasks.length > 0) {
                  <button (click)="rolloverAll()"
                    class="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                    Rollover All to Tomorrow
                  </button>
                }
              </div>

              <div class="space-y-1.5">
                @if (unfinishedTasks.length === 0) {
                  <div class="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                    <div class="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-sm">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <p class="text-xs font-semibold text-slate-800">Inbox Zero achieved!</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Every scheduled task was checked off. Outstanding work!</p>
                  </div>
                }

                @for (task of unfinishedTasks.slice(0, 6); track task.taskId) {
                  <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 bg-white">
                    <span class="text-xs text-slate-700 truncate max-w-[280px]">{{ task.title }}</span>
                    <button (click)="snoozeTask(task)"
                      class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                      +1 Day
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button (click)="close()"
              class="h-8 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button (click)="completeShutdown()"
              class="h-8 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-2xs flex items-center gap-1.5">
              <i class="fa-solid fa-lock text-[10px]"></i>
              <span>Complete Daily Shutdown</span>
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class EveningShutdownModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  completedToday: Task[] = [];
  unfinishedTasks: Task[] = [];
  private sub = new Subscription();

  constructor(
    private ritualService: DailyRitualService,
    private taskService: TaskService,
    private soundService: SoundFeedbackService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.ritualService.eveningModal$.subscribe((open) => {
        this.isOpen = open;
        if (open) {
          this.loadData();
        }
      })
    );
  }

  private async loadData(): Promise<void> {
    try {
      const tasks = await this.taskService.getAll();
      const all = tasks || [];
      this.completedToday = all.filter(t => !t.isDeleted && t.isCompleted);
      this.unfinishedTasks = all.filter(t => !t.isDeleted && !t.isCompleted);
    } catch {
      this.completedToday = [];
      this.unfinishedTasks = [];
    }
  }

  public async snoozeTask(task: Task): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      await this.taskService.update(task.taskId, { startTime: tomorrow.toISOString() });
      this.soundService.playClick();
      this.unfinishedTasks = this.unfinishedTasks.filter(t => t.taskId !== task.taskId);
      this.toast.success(`Rolled over "${task.title}" to tomorrow`);
    } catch {
      this.toast.error('Failed to update task');
    }
  }

  public async rolloverAll(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString();

    const promises = this.unfinishedTasks.map(t =>
      this.taskService.update(t.taskId, { startTime: tomorrowIso }).catch(() => null)
    );
    await Promise.all(promises);
    this.soundService.playClick();
    this.unfinishedTasks = [];
    this.toast.success('All unfinished tasks rolled over to tomorrow');
  }

  public completeShutdown(): void {
    this.soundService.playCelebration();
    this.ritualService.completeEveningShutdown();
    this.toast.success('Day complete! Disconnect and rest well tonight.');
  }

  public close(): void {
    this.ritualService.closeEveningShutdown();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
