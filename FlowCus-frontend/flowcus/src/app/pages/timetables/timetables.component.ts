import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../../core/services/timetable.service';
import { TimetableItemService } from '../../core/services/timetable-item.service';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { Timetable } from '../../core/models/timetable.model';
import { TimetableItem } from '../../core/models/timetable-item.model';
import { TaskCategory } from '../../core/models/task-category.model'
import { TaskSubtype } from '../../core/models/task-subtype.model';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { TaskService } from '../../core/services/task.service';
import { SoundFeedbackService } from '../../core/services/sound-feedback.service';
import { Task } from '../../core/models/task.model';
import { ActiveBlockService } from '../../core/services/active-block.service';

interface TimetableItemDetail extends TimetableItem {
  categoryName?: string;
  subtypeName?: string;
}

interface DaySummary {
  totalMinutes: number;
  tasks: { [key: string]: number };
}

@Component({
  selector: 'app-timetables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timetables.component.html'
})
export class TimetablesComponent implements OnInit {
  timetables: Timetable[] = [];
  selectedTimetable: Timetable | null = null;
  timetableItems: TimetableItemDetail[] = [];
  taskCategories: TaskCategory[] = [];
  taskSubtypes: TaskSubtype[] = [];

  // UI State
  showTimetableForm = false;
  showItemForm = false;
  showTemplateModal = false;
  selectedTemplate = 'student';
  isApplyingTemplate = false;
  editingTimetable: Timetable | null = null;
  editingItem: TimetableItemDetail | null = null;

  // Form Data
  timetableForm = { name: '', isActive: false };
  itemForm = {
    taskCategoryId: 0,
    taskSubtypeId: null as number | null,
    dayOfWeek: 0,
    specificDate: '',
    startTime: '',
    endTime: ''
  };

  // Calendar Data
  daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  timeSlots: string[] = [];

  loading = false;
  errorMessage = '';
  loadErrorMessage = '';

  windowWidth: number = 1024;
  activeMobileDayIndex: number = new Date().getDay();
  tasks: Task[] = [];
  expandedBlockId: number | null = null;
  private modalReturnFocus: HTMLElement | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private timetableService: TimetableService,
    private timetableItemService: TimetableItemService,
    private taskCategoryService: TaskCategoryService,
    private taskSubtypeService: TaskSubtypeService,
    private toastService: ToastService,
    private confirmService: ConfirmService,
    private taskService: TaskService,
    private activeBlockService: ActiveBlockService,
    public soundService: SoundFeedbackService
  ) {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      this.windowWidth = window.innerWidth;
    }
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    await this.loadTimetables();
    await this.loadTaskCategories();
    await this.loadTaskSubtypes();
    this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    try {
      const tasks = await this.taskService.getAll();
      this.tasks = tasks || [];
    } catch {
      this.tasks = [];
    }
  }

  getTasksForCategory(categoryId: number): Task[] {
    return this.tasks.filter(t => !t.isDeleted && !t.isCompleted && t.taskCategoryId === categoryId);
  }

  toggleBlockTasks(blockId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedBlockId = this.expandedBlockId === blockId ? null : blockId;
  }

  async toggleTaskComplete(task: Task, event: any): Promise<void> {
    event.stopPropagation();
    task.isCompleted = !task.isCompleted;
    if (task.isCompleted) {
      this.soundService.playSuccess();
    } else {
      this.soundService.playClick();
    }
    try {
      await this.taskService.toggleComplete(task.taskId, task.isCompleted);
    } catch {
      task.isCompleted = !task.isCompleted;
    }
  }

  generateTimeSlots(): void {
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = this.formatTime24to12({ hour, minute });
        this.timeSlots.push(time);
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (isPlatformBrowser(this.platformId) && event?.target?.innerWidth) {
      this.windowWidth = event.target.innerWidth;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    // Modal shortcuts
    if (this.showItemForm) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeItemForm();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        this.saveItem();
        return;
      }
    }

    if (this.showTemplateModal && event.key === 'Escape') {
      event.preventDefault();
      this.closeTemplateModal();
      return;
    }

    if (this.showTimetableForm && event.key === 'Escape') {
      event.preventDefault();
      this.closeTimetableForm();
      return;
    }

    if (this.showItemForm || this.showTemplateModal || this.showTimetableForm) {
      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('[data-timetable-dialog]');
        const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )) : [];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
      return;
    }

    if (isInput) return;

    if (event.key.toLowerCase() === 'b' && this.selectedTimetable) {
      event.preventDefault();
      this.openItemForm();
    } else if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      this.openTemplateModal();
    }
  }

  // Helper to map JS Day (0=Sun) to your App Day (0=Mon probably?)
  // If your app treats 0 as Sunday, this is fine.

  setActiveMobileDay(index: number) {
    this.activeMobileDayIndex = index;
  }

  formatTime24to12(time: { hour: number; minute: number }): string {
    const period = time.hour >= 12 ? 'PM' : 'AM';
    const hour12 = time.hour % 12 || 12;
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour12}:${minute} ${period}`;
  }

  convertTimeStringTo12Hour(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return this.formatTime24to12({ hour: hours, minute: minutes });
  }

  convertTime12to24(time12: string): string | null {
    const match = time12.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
    if (!match) return null;

    let [, hours, minutes, period] = match;
    let hour = parseInt(hours);

    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
  }

  async loadTimetables(): Promise<void> {
    try {
      this.loading = true;
      this.loadErrorMessage = '';
      this.timetables = await this.timetableService.getAll();
      if (this.timetables.length > 0 && !this.selectedTimetable) {
        const active = this.timetables.find(t => t.isActive) || this.timetables[0];
        this.selectTimetable(active);
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.loadErrorMessage = 'We could not load your schedules. Check your connection and try again.';
      console.error('Error loading timetables:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadTaskCategories(): Promise<void> {
    try {
      const data = await this.taskCategoryService.getAll();
      this.taskCategories = data.filter(c => !c.isDeleted);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to load categories:', error);
    }
  }

  async loadTaskSubtypes(): Promise<void> {
    try {
      const data = await this.taskSubtypeService.getAll();
      this.taskSubtypes = data.filter(s => !s.isDeleted);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to load subtypes:', error);
    }
  }

  getSubtypesForCategory(categoryId: number): TaskSubtype[] {
    return this.taskSubtypes.filter(s => s.categoryId === categoryId);
  }

  selectTimetable(timetable: Timetable): void {
    this.selectedTimetable = timetable;
    this.loadTimetableItems(timetable.id);
  }

  async loadTimetableItems(timetableId: number): Promise<void> {
    try {
      const data: any = await this.timetableItemService.getItems(timetableId);
      this.timetableItems = Array.isArray(data) ? data : [];
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to load timetable items:', error);
      this.timetableItems = [];
    }
  }

  // Timetable CRUD
  openTimetableForm(timetable?: Timetable): void {
    this.rememberModalFocus();
    if (timetable) {
      this.editingTimetable = timetable;
      this.timetableForm = { name: timetable.name, isActive: timetable.isActive };
    } else {
      this.editingTimetable = null;
      this.timetableForm = { name: '', isActive: false };
    }
    this.showTimetableForm = true;
    this.focusTimetableModal();
  }

  async saveTimetable(): Promise<void> {
    if (!this.timetableForm.name.trim()) {
      this.errorMessage = 'Timetable name is required';
      this.toastService.warning(this.errorMessage);
      return;
    }

    try {
      let timetableId: number | null = this.editingTimetable?.id ?? null;
      const isEditing = !!this.editingTimetable;
      let response: unknown;

      if (this.editingTimetable) {
        response = await this.timetableService.update(this.editingTimetable.id, this.timetableForm);
      } else {
        const created = await this.timetableService.create(this.timetableForm);
        response = created;
        timetableId = created.id;
      }

      if (this.timetableForm.isActive && timetableId) {
        await this.timetableService.activate(timetableId);
      }

      await this.loadTimetables();
      await this.activeBlockService.refresh();
      this.closeTimetableForm();
      this.toastService.successFrom(response, isEditing ? 'Timetable updated successfully.' : 'Timetable created successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = `Failed to ${this.editingTimetable ? 'update' : 'create'} timetable`;
      console.error('Error saving timetable:', error);
    }
  }

  async deleteTimetable(id: number): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete timetable',
      message: 'Are you sure you want to delete this timetable?',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await this.timetableService.delete(id);
      await this.loadTimetables();
      await this.activeBlockService.refresh();
      if (this.selectedTimetable?.id === id) {
        this.selectedTimetable = null;
        this.timetableItems = [];
      }
      this.toastService.successFrom(response, 'Timetable deleted successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = 'Failed to delete timetable';
      console.error('Error deleting timetable:', error);
    }
  }

  async activateTimetable(id: number): Promise<void> {
    try {
      const response = await this.timetableService.activate(id);
      await this.loadTimetables();
      await this.activeBlockService.refresh();
      this.toastService.successFrom(response, 'Timetable activated successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = 'Failed to activate timetable';
      console.error('Error activating timetable:', error);
    }
  }

  closeTimetableForm(): void {
    this.showTimetableForm = false;
    this.editingTimetable = null;
    this.timetableForm = { name: '', isActive: false };
    this.errorMessage = '';
    this.restoreModalFocus();
  }

  // Routine Templates
  openTemplateModal(): void {
    this.rememberModalFocus();
    this.showTemplateModal = true;
    this.focusTimetableModal();
  }

  closeTemplateModal(): void {
    this.showTemplateModal = false;
    this.restoreModalFocus();
  }

  async applyRoutineTemplate(templateName: string): Promise<void> {
    this.isApplyingTemplate = true;
    try {
      const res = await this.timetableService.applyTemplate(templateName);
      this.isApplyingTemplate = false;
      this.closeTemplateModal();
      this.toastService.success(res?.message || `Applied ${res?.name} template!`);
      await this.loadTimetables();
      await this.activeBlockService.refresh();
      if (res?.timetableId) {
        const newlyCreated = this.timetables.find(t => t.id === res.timetableId);
        if (newlyCreated) {
          await this.selectTimetable(newlyCreated);
        }
      }
    } catch (err: any) {
      this.isApplyingTemplate = false;
      this.toastService.error(err?.error?.error || 'Failed to apply template.');
    }
  }

  async shiftToday(minutes: number): Promise<void> {
    if (!this.selectedTimetable) {
      this.toastService.warning('Select a timetable before shifting its blocks.');
      return;
    }

    try {
      const res = await this.timetableService.shiftToday(minutes, this.activeMobileDayIndex, this.selectedTimetable.id);
      await this.activeBlockService.refresh();
      this.toastService.success(res?.message || `Shifted schedule by +${minutes}m`);
      if (this.selectedTimetable) {
        await this.loadTimetableItems(this.selectedTimetable.id);
      }
    } catch {
      this.toastService.error('Failed to shift schedule.');
    }
  }

  // Timetable Item CRUD
  openItemForm(item?: TimetableItemDetail, defaultDay?: number): void {
    this.rememberModalFocus();
    if (!this.selectedTimetable) return;

    if (item) {
      this.editingItem = item;
      this.itemForm = {
        taskCategoryId: item.taskCategoryId,
        taskSubtypeId: item.taskSubtypeId || null,
        dayOfWeek: item.dayOfWeek,
        specificDate: this.dateKey(item.specificDate),
        startTime: this.convertTimeStringTo12Hour(item.startTime),
        endTime: this.convertTimeStringTo12Hour(item.endTime)
      };
    } else {
      this.editingItem = null;
      this.itemForm = {
        taskCategoryId: 0,
        taskSubtypeId: null,
        dayOfWeek: defaultDay !== undefined ? defaultDay : (this.activeMobileDayIndex ?? 0),
        specificDate: '',
        startTime: '',
        endTime: ''
      };
    }
    this.showItemForm = true;
    this.focusTimetableModal();
  }

  async saveItem(): Promise<void> {
    if (!this.selectedTimetable || !this.itemForm.taskCategoryId || !this.itemForm.startTime || !this.itemForm.endTime) {
      this.errorMessage = 'Please fill all required fields';
      this.toastService.warning(this.errorMessage);
      return;
    }

    const startTime24 = this.convertTime12to24(this.itemForm.startTime);
    const endTime24 = this.convertTime12to24(this.itemForm.endTime);

    if (!startTime24 || !endTime24) {
      this.errorMessage = 'Please enter valid start and end times.';
      this.toastService.warning(this.errorMessage);
      return;
    }

    const startMinutes = this.timeToMinutes(startTime24);
    const endMinutes = this.timeToMinutes(endTime24);

    if (startMinutes >= endMinutes) {
      this.errorMessage = 'Start time must be before end time';
      this.toastService.warning(this.errorMessage);
      return;
    }

    const specificDate = this.dateKey(this.itemForm.specificDate) || null;
    const dayOfWeek = specificDate
      ? this.dayOfWeekForDate(specificDate)
      : this.itemForm.dayOfWeek;

    // A one-off block conflicts with recurring blocks on that weekday and
    // with other one-off blocks on the same date. Recurring blocks conflict
    // with one-offs on their weekday because they will eventually coincide.
    if (this.hasOverlap(dayOfWeek, startTime24, endTime24, this.editingItem?.id, specificDate)) {
      this.errorMessage = 'This time slot overlaps with an existing entry';
      this.toastService.warning(this.errorMessage);
      return;
    }

    const itemData = {
      timetableId: this.selectedTimetable.id,
      taskCategoryId: this.itemForm.taskCategoryId,
      taskSubtypeId: this.itemForm.taskSubtypeId,
      dayOfWeek,
      specificDate,
      startTime: startTime24,
      endTime: endTime24
    };

    try {
      const isEditing = !!this.editingItem;
      let response: unknown;
      if (this.editingItem) {
        response = await this.timetableItemService.update(this.editingItem.id, itemData);
      } else {
        response = await this.timetableItemService.create(itemData);
      }
      await this.activeBlockService.refresh();
      await this.loadTimetableItems(this.selectedTimetable.id);
      this.closeItemForm();
      this.toastService.successFrom(response, isEditing ? 'Time block updated successfully.' : 'Time block created successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = `Failed to ${this.editingItem ? 'update' : 'create'} item`;
      console.error('Error saving item:', error);
    }
  }

  async deleteItem(id: number): Promise<void> {
    if (!this.selectedTimetable) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Delete time block',
      message: 'Are you sure you want to delete this item?',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await this.timetableItemService.delete(id);
      await this.activeBlockService.refresh();
      await this.loadTimetableItems(this.selectedTimetable.id);
      this.toastService.successFrom(response, 'Time block deleted successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = 'Failed to delete item';
      console.error('Error deleting item:', error);
    }
  }

  closeItemForm(): void {
    this.showItemForm = false;
    this.editingItem = null;
    this.errorMessage = '';
    this.restoreModalFocus();
  }

  private rememberModalFocus(): void {
    if (!this.modalReturnFocus && typeof document !== 'undefined') {
      this.modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }

  private focusTimetableModal(): void {
    setTimeout(() => {
      const dialog = document.querySelector<HTMLElement>('[data-timetable-dialog]');
      (dialog?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), button:not([disabled])') || dialog)?.focus();
    }, 0);
  }

  private restoreModalFocus(): void {
    if (this.showItemForm || this.showTemplateModal || this.showTimetableForm) return;
    const target = this.modalReturnFocus;
    this.modalReturnFocus = null;
    setTimeout(() => target?.focus(), 0);
  }

  hasOverlap(dayOfWeek: number, startTime: string, endTime: string, excludeId?: number, specificDate: string | null = null): boolean {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    const itemsOnDay = this.timetableItems.filter(
      item => item.id !== excludeId &&
        (specificDate
          ? (item.specificDate
              ? this.dateKey(item.specificDate) === specificDate
              : item.dayOfWeek === dayOfWeek)
          : item.dayOfWeek === dayOfWeek)
    );

    for (const item of itemsOnDay) {
      const existingStart = this.timeToMinutes(item.startTime);
      const existingEnd = this.timeToMinutes(item.endTime);

      if (startMinutes < existingEnd && endMinutes > existingStart) {
        return true;
      }
    }
    return false;
  }

  // Calendar View Helpers
  getItemsForDay(dayOfWeek: number): TimetableItemDetail[] {
    return this.timetableItems.filter(item => !item.specificDate && item.dayOfWeek === dayOfWeek);
  }

  getOneOffItems(): TimetableItemDetail[] {
    return this.timetableItems
      .filter(item => !!this.dateKey(item.specificDate))
      .sort((a, b) => {
        const dateOrder = this.dateKey(a.specificDate).localeCompare(this.dateKey(b.specificDate));
        return dateOrder || a.startTime.localeCompare(b.startTime);
      });
  }

  setSpecificDate(value: string): void {
    this.itemForm.specificDate = this.dateKey(value);
    if (this.itemForm.specificDate) {
      this.itemForm.dayOfWeek = this.dayOfWeekForDate(this.itemForm.specificDate);
    }
  }

  formatSpecificDate(value: string | null | undefined): string {
    const localDate = this.localDateFromKey(this.dateKey(value));
    return localDate
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(localDate)
      : '';
  }

  private dateKey(value: string | null | undefined): string {
    if (!value) return '';
    const key = value.slice(0, 10);
    return this.localDateFromKey(key) ? key : '';
  }

  private localDateFromKey(value: string): Date | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
      return null;
    }
    return date;
  }

  private dayOfWeekForDate(value: string): number {
    return this.localDateFromKey(value)?.getDay() ?? this.itemForm.dayOfWeek;
  }

  getDaySummary(dayOfWeek: number): DaySummary {
    const items = this.getItemsForDay(dayOfWeek);
    const summary: DaySummary = { totalMinutes: 0, tasks: {} };

    items.forEach(item => {
      const start = this.timeToMinutes(item.startTime);
      const end = this.timeToMinutes(item.endTime);
      const duration = end - start;

      const taskName = item.categoryName || 'Unknown';
      summary.totalMinutes += duration;
      summary.tasks[taskName] = (summary.tasks[taskName] || 0) + duration;
    });

    return summary;
  }

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  getCategoryColor(categoryId: number): string {
    const category = this.taskCategories.find(c => c.id === categoryId);
    return category?.colorHex || '#6B7280';
  }

  deselectTimetable(): void {
    this.selectedTimetable = null;
    this.timetableItems = [];
  }

  // Helper method for keyvalue pipe in template
  Object = Object;
}
