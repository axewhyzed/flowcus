import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommandPaletteService } from '../../../core/services/command-palette.service';
import { ActiveBlockService } from '../../../core/services/active-block.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { SoundFeedbackService } from '../../../core/services/sound-feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Schedule' | 'Tasks';
  icon: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-start justify-center pt-20 sm:pt-28 p-4 animate-fade-in"
        (click)="close()">
        
        <div class="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()">
          
          <!-- Search Header Input -->
          <div class="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
            <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm"></i>
            <input #searchInput type="text" [(ngModel)]="searchQuery" (input)="filterCommands()"
              (keydown)="handleKeydown($event)"
              placeholder="Type a command or search tasks... (e.g. 'Timetable', 'Focus', 'Shift')"
              class="flex-1 text-sm bg-transparent outline-none text-slate-900 placeholder-slate-400 font-sans" />
            <kbd class="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded">
              Esc
            </kbd>
          </div>

          <!-- Command Results List -->
          <div class="max-h-80 overflow-y-auto p-2 space-y-1">
            @if (filteredCommands.length === 0) {
              <div class="py-8 text-center text-slate-400 text-xs">
                No matching commands found.
              </div>
            }

            @for (cmd of filteredCommands; track cmd.id; let i = $index) {
              <button (click)="execute(cmd)"
                (mouseenter)="selectedIndex = i"
                class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer"
                [ngClass]="selectedIndex === i ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'">
                
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs"
                    [ngClass]="selectedIndex === i ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'">
                    <i [class]="cmd.icon"></i>
                  </div>
                  <span class="truncate font-medium">{{ cmd.title }}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase"
                    [ngClass]="selectedIndex === i ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'">
                    {{ cmd.category }}
                  </span>
                </div>

                @if (cmd.shortcut) {
                  <kbd class="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    [ngClass]="selectedIndex === i ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-400 border border-slate-200'">
                    {{ cmd.shortcut }}
                  </kbd>
                }
              </button>
            }
          </div>

          <!-- Footer Tips -->
          <div class="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Ctrl+K to toggle</span>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  isOpen = false;
  searchQuery = '';
  selectedIndex = 0;

  commands: CommandItem[] = [];
  filteredCommands: CommandItem[] = [];

  private sub = new Subscription();

  constructor(
    private router: Router,
    private activeBlockService: ActiveBlockService,
    private timetableService: TimetableService,
    private soundService: SoundFeedbackService,
    private toast: ToastService,
    private taskService: TaskService,
    private paletteService: CommandPaletteService
  ) {}

  ngOnInit(): void {
    this.buildCommands();
    this.filteredCommands = [...this.commands];
    this.sub.add(
      this.paletteService.isOpen$.subscribe(open => {
        this.isOpen = open;
        if (open) {
          this.searchQuery = '';
          this.filterCommands();
          this.selectedIndex = 0;
          setTimeout(() => this.searchInputRef?.nativeElement.focus(), 50);
        }
      })
    );
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(e: KeyboardEvent): void {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.toggle();
    }
  }

  public open(): void {
    this.paletteService.open();
  }

  public close(): void {
    this.paletteService.close();
  }

  public toggle(): void {
    this.paletteService.toggle();
  }

  private buildCommands(): void {
    this.commands = [
      // Navigation
      {
        id: 'nav-dashboard',
        title: 'Go to Dashboard',
        category: 'Navigation',
        icon: 'fa-solid fa-gauge',
        shortcut: 'G D',
        action: () => this.router.navigate(['/dashboard'])
      },
      {
        id: 'nav-tasks',
        title: 'Go to Tasks Workspace',
        category: 'Navigation',
        icon: 'fa-solid fa-list-check',
        shortcut: 'G T',
        action: () => this.router.navigate(['/tasks'])
      },
      {
        id: 'nav-timetables',
        title: 'Go to Timetables & Schedules',
        category: 'Navigation',
        icon: 'fa-regular fa-calendar',
        shortcut: 'G S',
        action: () => this.router.navigate(['/timetables'])
      },
      {
        id: 'nav-categories',
        title: 'Go to Categories & Subcategories',
        category: 'Navigation',
        icon: 'fa-solid fa-tags',
        shortcut: 'G C',
        action: () => this.router.navigate(['/task-types'])
      },
      {
        id: 'nav-profile',
        title: 'Go to Account Settings & Backup',
        category: 'Navigation',
        icon: 'fa-regular fa-user',
        shortcut: 'G P',
        action: () => this.router.navigate(['/user'])
      },

      // Focus Actions
      {
        id: 'action-focus',
        title: 'Start Zen Focus Mode',
        category: 'Actions',
        icon: 'fa-solid fa-bullseye',
        shortcut: 'F',
        action: () => this.activeBlockService.openFocusMode()
      },

      // Schedule Shifts
      {
        id: 'shift-15',
        title: 'Shift Today’s Schedule +15 min',
        category: 'Schedule',
        icon: 'fa-solid fa-clock-rotate-left',
        action: () => this.shiftSchedule(15)
      },
      {
        id: 'shift-30',
        title: 'Shift Today’s Schedule +30 min',
        category: 'Schedule',
        icon: 'fa-solid fa-clock-rotate-left',
        action: () => this.shiftSchedule(30)
      },
      {
        id: 'shift-60',
        title: 'Shift Today’s Schedule +1 hour',
        category: 'Schedule',
        icon: 'fa-solid fa-clock-rotate-left',
        action: () => this.shiftSchedule(60)
      },

      // Print & Export
      {
        id: 'print-schedule',
        title: 'Print Weekly Timetable',
        category: 'Actions',
        icon: 'fa-solid fa-print',
        shortcut: 'Ctrl+P',
        action: () => {
          this.router.navigate(['/timetables']).then(() => {
            setTimeout(() => window.print(), 300);
          });
        }
      }
    ];
  }

  public filterCommands(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(
        c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
  }

  public handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % Math.max(1, this.filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = this.filteredCommands[this.selectedIndex];
      if (cmd) {
        this.execute(cmd);
      }
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  public execute(cmd: CommandItem): void {
    this.soundService.playClick();
    this.close();
    cmd.action();
  }

  private async shiftSchedule(minutes: number): Promise<void> {
    const today = new Date().getDay();
    try {
      const res = await this.timetableService.shiftToday(minutes, today);
      this.soundService.playSuccess();
      this.toast.success(res?.message || `Schedule shifted +${minutes}m`);
      this.activeBlockService.loadData();
    } catch (err) {
      this.toast.error('Could not shift schedule');
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
