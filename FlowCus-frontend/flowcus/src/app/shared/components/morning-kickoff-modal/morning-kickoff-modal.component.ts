import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyRitualService } from '../../../core/services/daily-ritual.service';
import { TaskService } from '../../../core/services/task.service';
import { ActiveBlockService } from '../../../core/services/active-block.service';
import { SoundFeedbackService } from '../../../core/services/sound-feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { Task } from '../../../core/models/task.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-morning-kickoff-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        (click)="close()">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center text-sm font-semibold">
                <i class="fa-regular fa-sun text-amber-600"></i>
              </div>
              <div>
                <h2 class="text-sm font-semibold text-slate-900 tracking-tight">Morning Kickoff Routine</h2>
                <p class="text-[11px] text-slate-500">60-second intention setting for peak clarity</p>
              </div>
            </div>
            <button (click)="close()" class="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <!-- Tip -->
            <div class="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <i class="fa-solid fa-lightbulb text-amber-500 mt-0.5 shrink-0 text-sm"></i>
              <span>Select up to 3 <strong>"Must-Win"</strong> tasks for today. Once committed, protect your time blocks to finish them.</span>
            </div>

            <!-- Priority Task Selection -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Top Priorities ({{ selectedTaskIds.size }}/3)</span>
                <span class="text-[11px] text-slate-400 font-mono">Tap star to toggle</span>
              </div>

              <div class="space-y-1.5">
                @if (pendingTasks.length === 0) {
                  <div class="py-6 text-center text-slate-400 text-xs">
                    No pending tasks found. Enjoy your open schedule!
                  </div>
                }

                @for (task of pendingTasks.slice(0, 8); track task.taskId) {
                  <div (click)="toggleStar(task)"
                    class="flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none"
                    [ngClass]="selectedTaskIds.has(task.taskId) ? 'bg-amber-50/50 border-amber-300 text-slate-900 shadow-2xs' : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700'">
                    
                    <div class="flex items-center gap-2.5 min-w-0">
                      <button (click)="toggleStar(task); $event.stopPropagation()"
                        class="text-xs p-1 transition-transform"
                        [ngClass]="selectedTaskIds.has(task.taskId) ? 'text-amber-500 scale-110' : 'text-slate-300 hover:text-slate-400'">
                        <i class="fa-solid fa-star"></i>
                      </button>
                      <span class="text-xs font-medium truncate">{{ task.title }}</span>
                    </div>

                    @if (selectedTaskIds.has(task.taskId)) {
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Priority
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button (click)="close()"
              class="h-8 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
              Skip for Today
            </button>
            <button (click)="commitDay()"
              class="h-8 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-2xs flex items-center gap-1.5">
              <i class="fa-solid fa-check text-[10px]"></i>
              <span>Commit Today’s Focus</span>
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class MorningKickoffModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  pendingTasks: Task[] = [];
  selectedTaskIds = new Set<number>();
  private sub = new Subscription();

  constructor(
    private ritualService: DailyRitualService,
    private taskService: TaskService,
    private soundService: SoundFeedbackService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.ritualService.morningModal$.subscribe((open) => {
        this.isOpen = open;
        if (open) {
          this.loadPendingTasks();
        }
      })
    );
  }

  private async loadPendingTasks(): Promise<void> {
    try {
      const tasks = await this.taskService.getAll();
      this.pendingTasks = (tasks || []).filter(t => !t.isDeleted && !t.isCompleted);
      // Pre-select high priority tasks (up to 3)
      this.selectedTaskIds.clear();
      for (const t of this.pendingTasks) {
        if (t.priority === 3 && this.selectedTaskIds.size < 3) {
          this.selectedTaskIds.add(t.taskId);
        }
      }
    } catch {
      this.pendingTasks = [];
    }
  }

  public toggleStar(task: Task): void {
    this.soundService.playClick();
    if (this.selectedTaskIds.has(task.taskId)) {
      this.selectedTaskIds.delete(task.taskId);
    } else {
      if (this.selectedTaskIds.size >= 3) {
        this.toast.info('Maximum 3 top priorities recommended for focus');
        return;
      }
      this.selectedTaskIds.add(task.taskId);
    }
  }

  public async commitDay(): Promise<void> {
    // Elevate selected tasks to priority 3 (High)
    const promises = Array.from(this.selectedTaskIds).map(id =>
      this.taskService.update(id, { priority: 3 }).catch(() => null)
    );
    await Promise.all(promises);
    this.soundService.playCelebration();
    this.ritualService.completeMorningKickoff();
    this.toast.success('Daily priorities locked in! Have a productive day.');
  }

  public close(): void {
    this.ritualService.closeMorningKickoff();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
