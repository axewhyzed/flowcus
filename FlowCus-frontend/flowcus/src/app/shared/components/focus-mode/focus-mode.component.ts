import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiveBlockService, ActiveBlockInfo } from '../../../core/services/active-block.service';
import { SoundFeedbackService } from '../../../core/services/sound-feedback.service';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { ToastService } from '../../../core/services/toast.service';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-focus-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div role="dialog" aria-modal="true" aria-label="Focus mode" class="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 select-none animate-fade-in backdrop-blur-2xl">
        
        <!-- Top Toolbar -->
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
              [style.backgroundColor]="(activeBlock?.categoryColor || '#3b82f6') + '25'"
              [style.color]="activeBlock?.categoryColor || '#3b82f6'">
              <i [class]="activeBlock?.categoryIcon || 'fa-solid fa-shapes'"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {{ activeBlock?.categoryName || 'Deep Focus Session' }}
                </span>
                @if (activeBlock?.subtypeName) {
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {{ activeBlock?.subtypeName }}
                  </span>
                }
              </div>
              <p class="text-[11px] text-slate-500 font-mono mt-0.5">
                {{ activeBlock ? (activeBlock.startFormatted + ' – ' + activeBlock.endFormatted) : 'Self-Directed Focus' }}
              </p>
            </div>
          </div>

          <!-- Sound & Window Controls -->
          <div class="flex items-center gap-2">
            <!-- Ambient Noise Selector -->
            <div class="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <span class="text-[10px] text-slate-500 px-1 font-mono uppercase">Sound:</span>
              <button (click)="setAmbient('none')"
                class="px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                [ngClass]="activeAmbient === 'none' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'">
                Off
              </button>
              <button (click)="setAmbient('brown')"
                class="px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                [ngClass]="activeAmbient === 'brown' ? 'bg-amber-950/60 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'">
                Brown
              </button>
              <button (click)="setAmbient('white')"
                class="px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                [ngClass]="activeAmbient === 'white' ? 'bg-sky-950/60 text-sky-300 font-medium' : 'text-slate-400 hover:text-slate-200'">
                Rain
              </button>
              <button (click)="setAmbient('binaural')"
                class="px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                [ngClass]="activeAmbient === 'binaural' ? 'bg-emerald-950/60 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'">
                Alpha
              </button>
            </div>

            <!-- Fullscreen Button -->
            <button (click)="toggleFullscreen()" title="Toggle Fullscreen"
              class="h-8 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center text-xs transition-colors cursor-pointer">
              <i [class]="isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
            </button>

            <!-- Close Zen Mode Button -->
            <button (click)="close()" title="Exit Zen Mode (Esc)"
              class="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5 text-xs transition-colors cursor-pointer">
              <span>Exit</span>
              <kbd class="text-[10px] font-mono px-1 py-0.2 bg-slate-800 text-slate-400 rounded">Esc</kbd>
            </button>
          </div>
        </div>

        <!-- Center Focus Display: Countdown & Focus Item -->
        <div class="flex flex-col items-center justify-center my-auto max-w-xl mx-auto w-full text-center">
          
          <!-- Countdown Digits -->
          <div class="mb-4">
            <h1 class="text-7xl sm:text-8xl md:text-9xl font-extralight tracking-tight text-white font-mono drop-shadow-sm">
              {{ displayTime }}
            </h1>
            <p class="text-xs uppercase tracking-widest text-slate-500 font-mono mt-2">
              {{ activeBlock ? 'Time Remaining in Current Block' : 'Time Remaining in Focus Sprint' }}
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-8 border border-slate-800/80">
            <div class="h-full rounded-full transition-all duration-1000 ease-linear"
              [style.width.%]="progressPercent"
              [style.backgroundColor]="activeBlock?.categoryColor || '#38bdf8'"></div>
          </div>

          <!-- Action Tasks for This Block -->
          <div class="w-full bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-list-check text-slate-500"></i>
                <span>Suggested Focus Tasks</span>
              </h3>
              <span class="text-[11px] font-mono text-slate-500">
                {{ completedCount }}/{{ blockTasks.length }} completed
              </span>
            </div>

            <!-- Task List -->
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1 text-left">
              @if (blockTasks.length === 0) {
                <div class="text-center py-6 text-slate-500 text-xs">
                  No open tasks are available here. Add one below to get started.
                </div>
              }

              @for (task of blockTasks; track task.taskId) {
                <div class="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition-all group">
                  <button (click)="toggleTask(task)"
                    [attr.aria-label]="(task.isCompleted ? 'Mark incomplete: ' : 'Mark complete: ') + task.title"
                    [attr.aria-pressed]="!!task.isCompleted"
                    class="w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    [ngClass]="task.isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'">
                    @if (task.isCompleted) {
                      <i class="fa-solid fa-check text-[10px]"></i>
                    }
                  </button>
                  <span class="text-xs flex-1 truncate transition-all"
                    [ngClass]="task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'">
                    {{ task.title }}
                  </span>
                  @if (task.priority === 1) {
                    <span class="text-[10px] text-red-400 font-mono shrink-0">High</span>
                  }
                </div>
              }
            </div>

            <!-- Quick Add Task Inside Zen Session -->
            <div class="mt-3 pt-3 border-t border-slate-800 flex gap-2">
              <input type="text" [(ngModel)]="newTaskTitle" (keydown.enter)="quickAddTask()"
                aria-label="Add a focus task"
                placeholder="Quick-add task to focus on..."
                class="flex-1 h-8 px-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600" />
              <button (click)="quickAddTask()"
                [disabled]="!newTaskTitle.trim()"
                aria-label="Add focus task"
                class="h-8 px-3 bg-white text-slate-950 font-medium text-xs rounded-lg hover:bg-slate-200 transition-colors shrink-0 cursor-pointer">
                Add
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Status & Wrap Up -->
        <div class="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-500">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Distraction-free environment</span>
          </div>
          <button (click)="wrapUpBlock()"
            class="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
            <i class="fa-solid fa-flag-checkered text-[10px]"></i>
            <span>Complete & Wrap Up</span>
          </button>
        </div>

      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.99); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class FocusModeComponent implements OnInit, OnDestroy {
  isOpen = false;
  activeBlock: ActiveBlockInfo | null = null;
  displayTime = '00:00';
  progressPercent = 0;
  isCountingDown = false;
  isFullscreen = false;

  blockTasks: Task[] = [];
  newTaskTitle = '';
  activeAmbient: 'none' | 'brown' | 'white' | 'binaural' = 'none';

  private subs = new Subscription();
  private timerSub?: Subscription;
  private remainingSeconds = 0;
  private sessionTotalSeconds = 25 * 60;

  constructor(
    private activeBlockService: ActiveBlockService,
    private soundService: SoundFeedbackService,
    private taskService: TaskService,
    private toast: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.activeBlockService.isFocusModeOpen$.subscribe((open) => {
        this.isOpen = open;
        if (open) {
          this.initSession();
        } else {
          this.persistFocusState();
          this.stopTimer();
          this.soundService.stopAmbient();
          this.activeAmbient = 'none';
        }
      })
    );

    this.subs.add(
      this.activeBlockService.activeBlock$.subscribe((block) => {
        this.activeBlock = block;
        if (this.isOpen) {
          this.loadBlockTasks();
        }
      })
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  private initSession(): void {
    this.loadBlockTasks();
    if (!this.restoreFocusState()) {
      this.isCountingDown = true;
      this.sessionTotalSeconds = this.activeBlock && this.activeBlock.remainingMinutes > 0
        ? this.activeBlock.remainingMinutes * 60
        : 25 * 60;
      this.remainingSeconds = this.sessionTotalSeconds;
      this.progressPercent = 0;
    }
    this.updateDisplayTime();
    this.startTimer();
  }

  private async loadBlockTasks(): Promise<void> {
    try {
      const tasks = await this.taskService.getAll();
      if (!tasks) return;
      if (this.activeBlock) {
        const matching = tasks.filter(t => !t.isDeleted && t.taskCategoryId === this.activeBlock?.taskCategoryId);
        this.blockTasks = matching.length > 0 ? matching : tasks.filter(t => !t.isDeleted && !t.isCompleted).slice(0, 5);
      } else {
        this.blockTasks = tasks.filter(t => !t.isDeleted && !t.isCompleted).slice(0, 5);
      }
    } catch {}
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerSub = interval(1000).subscribe(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplayTime();
        if (this.activeBlock && this.activeBlock.totalMinutes > 0) {
          const elapsedSecs = this.sessionTotalSeconds - this.remainingSeconds;
          this.progressPercent = Math.min(100, Math.max(0, (elapsedSecs / this.sessionTotalSeconds) * 100));
        } else {
          const elapsedSecs = this.sessionTotalSeconds - this.remainingSeconds;
          this.progressPercent = Math.min(100, Math.max(0, (elapsedSecs / this.sessionTotalSeconds) * 100));
        }
        this.persistFocusState();
      } else {
        this.stopTimer();
        this.clearFocusState();
        this.soundService.playCelebration();
        this.toast.success('Focus block finished! Well done.');
      }
    });
  }

  private stopTimer(): void {
    this.timerSub?.unsubscribe();
  }

  private updateDisplayTime(): void {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    this.displayTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public get completedCount(): number {
    return this.blockTasks.filter(t => t.isCompleted).length;
  }

  public async toggleTask(task: Task): Promise<void> {
    const previousStatus = !!task.isCompleted;
    const newStatus = !previousStatus;
    task.isCompleted = newStatus;
    if (newStatus) {
      this.soundService.playSuccess();
    } else {
      this.soundService.playClick();
    }
    try {
      await this.taskService.toggleComplete(task.taskId, newStatus);
    } catch {
      task.isCompleted = previousStatus;
      this.toast.error('Could not update this task. Please try again.');
    }
  }

  public async quickAddTask(): Promise<void> {
    if (!this.newTaskTitle.trim()) return;
    const taskData: Partial<Task> = {
      title: this.newTaskTitle.trim(),
      taskCategoryId: this.activeBlock?.taskCategoryId || 1,
      priority: 2,
      isCompleted: false
    };

    try {
      await this.taskService.create(taskData);
      this.newTaskTitle = '';
      await this.loadBlockTasks();
      this.soundService.playClick();
      this.toast.success('Task added to session');
    } catch {
      this.toast.error('Could not add the task. Your text is still here; try again.');
    }
  }

  public setAmbient(type: 'none' | 'brown' | 'white' | 'binaural'): void {
    this.activeAmbient = type;
    if (type === 'none') {
      this.soundService.stopAmbient();
    } else {
      this.soundService.startAmbient(type, 0.4);
    }
  }

  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => this.isFullscreen = true).catch(() => {});
    } else {
      document.exitFullscreen().then(() => this.isFullscreen = false).catch(() => {});
    }
  }

  public wrapUpBlock(): void {
    this.stopTimer();
    this.remainingSeconds = 0;
    this.clearFocusState();
    this.soundService.playCelebration();
    this.toast.success(`Great focus session! Completed ${this.completedCount} task(s).`);
    this.close();
  }

  public close(): void {
    this.persistFocusState();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.activeBlockService.closeFocusMode();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.persistFocusState();
    this.stopTimer();
    this.soundService.stopAmbient();
  }

  private focusStorageKey(): string {
    return `flowcus_focus_mode_${this.authService.user?.id ?? 'anonymous'}`;
  }

  private restoreFocusState(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    let serialized: string | null;
    try {
      serialized = sessionStorage.getItem(this.focusStorageKey());
    } catch {
      return false;
    }
    if (!serialized) return false;
    try {
      const state = JSON.parse(serialized);
      if (!Number.isFinite(state.remainingSeconds) || state.remainingSeconds <= 0) {
        this.clearFocusState();
        return false;
      }
      this.remainingSeconds = state.remainingSeconds;
      this.sessionTotalSeconds = Number.isFinite(state.sessionTotalSeconds) && state.sessionTotalSeconds > 0
        ? state.sessionTotalSeconds
        : 25 * 60;
      this.progressPercent = Number.isFinite(state.progressPercent) ? state.progressPercent : 0;
      this.isCountingDown = state.isCountingDown !== false;
      return true;
    } catch {
      this.clearFocusState();
      return false;
    }
  }

  private persistFocusState(): void {
    if (typeof sessionStorage === 'undefined' || this.remainingSeconds <= 0) return;
    try {
      sessionStorage.setItem(this.focusStorageKey(), JSON.stringify({
        remainingSeconds: this.remainingSeconds,
        sessionTotalSeconds: this.sessionTotalSeconds,
        progressPercent: this.progressPercent,
        isCountingDown: this.isCountingDown
      }));
    } catch {
      // A running focus timer remains usable when browser storage is disabled.
    }
  }

  private clearFocusState(): void {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(this.focusStorageKey());
    } catch {
      // Keep the focus timer usable when browser storage is unavailable.
    }
  }
}
