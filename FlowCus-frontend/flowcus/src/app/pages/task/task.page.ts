import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { TaskService } from '../../core/services/task.service';
import { Task } from '../../core/models/task.model';
import { TaskCategory } from '../../core/models/task-category.model';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { TaskSubtype } from '../../core/models/task-subtype.model';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NlpTaskParserService, ParsedTaskDraft } from '../../core/services/nlp-task-parser.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.page.html',
  imports: [CommonModule, FormsModule, RouterModule],
  styleUrls: ['./task.page.css'],
  standalone: true
})
export class TaskPage implements OnInit {
  @ViewChild('quickAddInputEl') quickAddInputEl?: ElementRef<HTMLInputElement>;

  tasks: Task[] = [];
  newTask: Partial<Task> = {
    title: '',
    description: '',
    taskCategoryId: 0,
    taskSubtypeId: null,
    priority: 3,
    startTime: '',
    endTime: ''
  };
  editingTask: Task | null = null;
  showTaskForm = false;

  // NLP Quick Add
  quickAddText: string = '';
  parsedDraft: ParsedTaskDraft | null = null;
  isSubmittingQuickAdd: boolean = false;

  categories: TaskCategory[] = [];
  subcategories: TaskSubtype[] = [];

  // Workspace Navigation & Filters
  activeView: 'all' | 'today' | 'upcoming' | 'completed' = 'all';
  searchQuery: string = '';
  selectedCategoryId: number | null = null;
  selectedPriority: number | null = null;
  sortBy: 'newest' | 'oldest' | 'priority' = 'newest';
  completionFilter: 'all' | 'active' | 'completed' = 'all';
  viewMode: 'list' | 'grid' = 'list';
  isMobileSidebarOpen: boolean = false;
  showShortcutsModal: boolean = false;

  getPriorityBadgeClass(priority?: number): string {
    switch (priority) {
      case 1: return 'bg-rose-50 text-rose-700 border-rose-200';
      case 2: return 'bg-orange-50 text-orange-700 border-orange-200';
      case 3: return 'bg-amber-50 text-amber-700 border-amber-200';
      case 4: return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  constructor(
    private taskService: TaskService,
    private taskCategoryService: TaskCategoryService,
    private subtypeService: TaskSubtypeService,
    private nlpParser: NlpTaskParserService,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) { }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    // Shortcuts active when inside the New/Edit Task Modal
    if (this.showTaskForm) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeTaskForm();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        this.saveTask();
        return;
      }
    }

    if (this.showShortcutsModal && event.key === 'Escape') {
      event.preventDefault();
      this.showShortcutsModal = false;
      return;
    }

    // Inside input fields
    if (isInput) {
      if (event.key === 'Escape') {
        if (this.quickAddText) {
          this.quickAddText = '';
          this.parsedDraft = null;
        }
        (event.target as HTMLElement).blur();
      }
      return;
    }

    // Global hotkeys when not inside an input field
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      this.showShortcutsModal = !this.showShortcutsModal;
    } else if (event.key.toLowerCase() === 'q' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
      event.preventDefault();
      this.quickAddInputEl?.nativeElement?.focus();
    } else if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.openTaskForm();
    } else if (event.key === '/') {
      event.preventDefault();
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    } else if (event.key === '1') {
      this.viewMode = 'list';
    } else if (event.key === '2') {
      this.viewMode = 'grid';
    } else if (event.key === 'Escape') {
      this.searchQuery = '';
      this.selectedCategoryId = null;
      this.selectedPriority = null;
      this.activeView = 'all';
    }
  }

  onQuickAddInput() {
    if (!this.quickAddText.trim()) {
      this.parsedDraft = null;
      return;
    }
    this.parsedDraft = this.nlpParser.parse(this.quickAddText);
  }

  async submitQuickAdd() {
    if (!this.quickAddText.trim() || this.isSubmittingQuickAdd) return;

    const draft = this.nlpParser.parse(this.quickAddText);
    if (!draft.cleanTitle) {
      this.toastService.warning('Please enter a task title.');
      return;
    }

    this.isSubmittingQuickAdd = true;

    // Resolve category from #tag, or currently selected category, or default to first
    let matchedCatId = this.selectedCategoryId || this.categories[0]?.id || 1;
    if (draft.categoryTag) {
      const found = this.categories.find(c => 
        c.name.toLowerCase().includes(draft.categoryTag!) || 
        draft.categoryTag!.includes(c.name.toLowerCase())
      );
      if (found) matchedCatId = found.id;
    }

    const payload: Partial<Task> = {
      title: draft.cleanTitle,
      taskCategoryId: matchedCatId,
      priority: draft.priority || 3,
      startTime: draft.startTime ? draft.startTime.toISOString() : undefined,
      endTime: draft.endTime ? draft.endTime.toISOString() : undefined,
      isCompleted: false
    };

    try {
      await this.taskService.create(payload);
      this.quickAddText = '';
      this.parsedDraft = null;
      this.toastService.success(`✨ Created task: ${payload.title}`);
      await this.loadTasks();
    } catch (err: any) {
      this.toastService.error(err?.error?.error || 'Failed to create task.');
    } finally {
      this.isSubmittingQuickAdd = false;
    }
  }

  async ngOnInit() {
    await Promise.all([
      this.loadTasks(),
      this.loadCategories(),
      this.loadSubcategories()
    ]);

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'create') {
        this.openTaskForm();
      } else if (params['action'] === 'quick') {
        setTimeout(() => this.quickAddInputEl?.nativeElement?.focus(), 150);
      }
      if (params['category']) {
        const catId = Number(params['category']);
        if (!isNaN(catId)) this.selectedCategoryId = catId;
      }
    });
  }

  async loadTasks() {
    try {
      const response = await this.taskService.getAll();
      this.tasks = response ?? [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.tasks = [];
    }
  }

  async loadCategories() {
    const cats = await this.taskCategoryService.getAll();
    this.categories = cats ?? [];
  }

  async loadSubcategories() {
    const subs = await this.subtypeService.getAll();
    this.subcategories = subs ?? [];
  }

  // Sidebar counters
  get countAll(): number {
    return this.tasks.filter(t => !t.isCompleted).length;
  }

  get countToday(): number {
    const today = new Date().toDateString();
    return this.tasks.filter(t => !t.isCompleted && t.startTime && new Date(t.startTime).toDateString() === today).length;
  }

  get countUpcoming(): number {
    const now = new Date();
    return this.tasks.filter(t => !t.isCompleted && t.startTime && new Date(t.startTime) > now).length;
  }

  get countCompleted(): number {
    return this.tasks.filter(t => t.isCompleted).length;
  }

  getCategoryTaskCount(categoryId: number): number {
    return this.tasks.filter(t => !t.isCompleted && t.taskCategoryId === categoryId).length;
  }

  get currentViewTitle(): string {
    if (this.selectedCategoryId) {
      return this.categoryNameById(this.selectedCategoryId);
    }
    switch (this.activeView) {
      case 'today': return 'Today';
      case 'upcoming': return 'Upcoming';
      case 'completed': return 'Completed';
      default: return 'All Tasks';
    }
  }

  selectView(view: 'all' | 'today' | 'upcoming' | 'completed') {
    this.activeView = view;
    this.selectedCategoryId = null;
    this.selectedPriority = null;
    this.isMobileSidebarOpen = false;
  }

  selectCategoryFilter(categoryId: number | null) {
    if (this.selectedCategoryId === categoryId) {
      this.selectedCategoryId = null;
    } else {
      this.selectedCategoryId = categoryId;
      this.activeView = 'all';
    }
    this.isMobileSidebarOpen = false;
  }

  selectPriorityFilter(priority: number | null) {
    this.selectedPriority = this.selectedPriority === priority ? null : priority;
  }

  get filteredTasks(): Task[] {
    const now = new Date();
    const todayStr = now.toDateString();

    return this.tasks
      .filter(task => {
        // Search query filter
        const matchesSearch = !this.searchQuery.trim() || (
          task.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(this.searchQuery.toLowerCase())
        );

        // Category filter
        const matchesCategory = this.selectedCategoryId ? task.taskCategoryId === this.selectedCategoryId : true;

        // Priority filter
        const matchesPriority = this.selectedPriority ? task.priority === this.selectedPriority : true;

        // View filter (all / today / upcoming / completed)
        let matchesView = true;
        if (this.activeView === 'today') {
          matchesView = !task.isCompleted && (
            (task.startTime && new Date(task.startTime).toDateString() === todayStr) ||
            (!task.startTime && new Date(task.createdOn).toDateString() === todayStr)
          );
        } else if (this.activeView === 'upcoming') {
          matchesView = !task.isCompleted && !!task.startTime && new Date(task.startTime) > now;
        } else if (this.activeView === 'completed') {
          matchesView = !!task.isCompleted;
        } else {
          // 'all' view - filter by completion dropdown
          if (this.completionFilter === 'active') {
            matchesView = !task.isCompleted;
          } else if (this.completionFilter === 'completed') {
            matchesView = !!task.isCompleted;
          }
        }

        return matchesSearch && matchesCategory && matchesPriority && matchesView;
      })
      .sort((a, b) => {
        if (this.sortBy === 'priority') return (a.priority || 99) - (b.priority || 99);
        const dateA = new Date(a.createdOn || 0).getTime();
        const dateB = new Date(b.createdOn || 0).getTime();
        return this.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }

  getSubcategoriesByCategory(categoryId: number | null | undefined): TaskSubtype[] {
    if (!categoryId) return [];
    return this.subcategories.filter(s => s.categoryId === Number(categoryId));
  }

  async toggleComplete(task: Task) {
    const previousState = !!task.isCompleted;
    task.isCompleted = !previousState;

    try {
      await this.taskService.toggleComplete(task.taskId, task.isCompleted);
      this.toastService.success(task.isCompleted ? 'Task marked as completed.' : 'Task marked as active.');
    } catch (error) {
      task.isCompleted = previousState;
      this.toastService.error('Failed to update task status.');
      console.error('Error toggling task completion:', error);
    }
  }

  openTaskForm(task?: Task) {
    if (task) {
      this.editingTask = { ...task };
      this.newTask = {
        ...task,
        startTime: this.toDateTimeLocalValue(task.startTime),
        endTime: this.toDateTimeLocalValue(task.endTime)
      };
    } else {
      this.editingTask = null;
      this.newTask = this.getEmptyTaskForm();
      if (this.selectedCategoryId) {
        this.newTask.taskCategoryId = this.selectedCategoryId;
      }
    }
    this.showTaskForm = true;
  }

  closeTaskForm() {
    this.showTaskForm = false;
    this.editingTask = null;
    this.newTask = this.getEmptyTaskForm();
  }

  async saveTask() {
    if (!this.newTask.title?.trim() || !this.newTask.taskCategoryId || this.newTask.taskCategoryId <= 0) {
      this.toastService.warning('Please enter a title and select a category.');
      return;
    }

    if (this.newTask.priority && (this.newTask.priority < 1 || this.newTask.priority > 5)) {
      this.toastService.warning('Priority must be between 1 and 5.');
      return;
    }

    try {
      const isEditing = !!this.editingTask;
      let response: unknown;
      if (this.editingTask) {
        response = await this.taskService.update(this.editingTask.taskId, this.newTask);
      } else {
        response = await this.taskService.create(this.newTask);
      }
      await this.loadTasks();
      this.closeTaskForm();
      this.toastService.successFrom(response, isEditing ? 'Task updated successfully.' : 'Task created successfully.');
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }

  async deleteTask(id: number) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await this.taskService.delete(id);
      await this.loadTasks();
      this.toastService.successFrom(response, 'Task deleted successfully.');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  categoryNameById(id: number | null | undefined): string {
    if (!id || !this.categories?.length) return 'Uncategorized';
    const c = this.categories.find(x => x.id === id);
    return c?.name ?? 'Uncategorized';
  }

  subcategoryNameById(id: number | null | undefined): string {
    if (!id || !this.subcategories?.length) return '';
    const s = this.subcategories.find(x => x.id === id);
    return s?.name ?? '';
  }

  formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getEmptyTaskForm(): Partial<Task> {
    const now = new Date();
    return {
      title: '',
      description: '',
      taskCategoryId: this.categories[0]?.id || 1,
      taskSubtypeId: null,
      priority: 3,
      startTime: this.toDateTimeLocalValue(now),
      endTime: this.toDateTimeLocalValue(new Date(now.getTime() + 30 * 60000))
    };
  }

  private toDateTimeLocalValue(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (part: number) => part.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  Object = Object;
}
