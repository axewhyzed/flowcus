import { Injectable } from '@angular/core';
import { TaskService } from './task.service';
import { TimetableService } from './timetable.service';
import { TimetableItemService } from './timetable-item.service';
import { TaskCategoryService } from './task-category.service';
import { TaskSubtypeService } from './task-subtype.service';
import { ToastService } from './toast.service';
import { localDateKey } from '../utils/local-date-time';

export interface FlowcusBackup {
  version: string;
  exportedAt: string;
  tasks: unknown[];
  categories: unknown[];
  subtypes: unknown[];
  timetables: unknown[];
  timetableItems: unknown[];
}

@Injectable({
  providedIn: 'root'
})
export class DataPortabilityService {
  constructor(
    private taskService: TaskService,
    private timetableService: TimetableService,
    private timetableItemService: TimetableItemService,
    private categoryService: TaskCategoryService,
    private subtypeService: TaskSubtypeService,
    private toast: ToastService
  ) {}

  /** Exports complete local/server database into a single JSON backup */
  public async exportJson(): Promise<void> {
    try {
      const [tasks, categories, subtypes, timetables] = await Promise.all([
        this.taskService.getAll(),
        this.categoryService.getAll(),
        this.subtypeService.getAll(),
        this.timetableService.getAll()
      ]);
      const timetableItems = (await Promise.all(
        (timetables || []).map(timetable => this.timetableItemService.getItems(timetable.id))
      )).flat();

      const backup: FlowcusBackup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        tasks: tasks ?? [],
        categories: categories ?? [],
        subtypes: subtypes ?? [],
        timetables: timetables ?? [],
        timetableItems
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const dateStr = localDateKey(new Date());
      this.downloadFile(blob, `flowcus-backup-${dateStr}.json`);
      this.toast.success('System backup exported successfully');
    } catch {
      this.toast.error('Failed to generate full backup');
    }
  }

  /** Exports tasks to clean readable Markdown */
  public async exportMarkdown(): Promise<void> {
    try {
      const tasks = await this.taskService.getAll();
      const dateStr = localDateKey(new Date());
      let md = `# FlowCus Tasks — ${dateStr}\n\n`;
      md += `*Exported from FlowCus productivity workspace*\n\n`;

      const pending = (tasks || []).filter(t => !t.isDeleted && !t.isCompleted);
      const completed = (tasks || []).filter(t => !t.isDeleted && t.isCompleted);

      md += `## Pending Tasks (${pending.length})\n\n`;
      if (pending.length === 0) {
        md += `*No pending tasks.*\n\n`;
      } else {
        for (const t of pending) {
          const priorityStr = t.priority ? ` [P${t.priority}]` : '';
          const timeStr = t.startTime ? ` (${t.startTime.substring(0, 5)})` : '';
          md += `- [ ] **${t.title}**${priorityStr}${timeStr}\n`;
          if (t.description) {
            md += `  > ${t.description}\n`;
          }
        }
        md += `\n`;
      }

      md += `## Completed Tasks (${completed.length})\n\n`;
      if (completed.length === 0) {
        md += `*No completed tasks.*\n\n`;
      } else {
        for (const t of completed) {
          md += `- [x] ~~${t.title}~~\n`;
        }
        md += `\n`;
      }

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      this.downloadFile(blob, `flowcus-tasks-${dateStr}.md`);
      this.toast.success('Markdown tasks exported');
    } catch {
      this.toast.error('Could not export tasks to Markdown');
    }
  }

  /** Trigger browser download */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Keep the object URL alive until the browser has started consuming the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
