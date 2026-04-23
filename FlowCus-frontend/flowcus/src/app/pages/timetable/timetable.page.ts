import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../../core/services/timetable.service';
import { TimetableItemService } from '../../core/services/timetable-item.service';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { Timetable } from '../../core/models/timetable.model';
import { TimetableItem } from '../../core/models/timetable-item.model';
import { TaskCategory } from '../../core/models/task-category.model'
import { TaskSubtype } from '../../core/models/task-subtype.model';

interface TimetableItemDetail extends TimetableItem {
  categoryName?: string;
  subtypeName?: string;
}

interface DaySummary {
  totalMinutes: number;
  tasks: { [key: string]: number };
}

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timetable.page.html'
})
export class TimetablePage implements OnInit {
  timetables: Timetable[] = [];
  selectedTimetable: Timetable | null = null;
  timetableItems: TimetableItemDetail[] = [];
  taskCategories: TaskCategory[] = [];
  taskSubtypes: TaskSubtype[] = [];

  // UI State
  showTimetableForm = false;
  showItemForm = false;
  editingTimetable: Timetable | null = null;
  editingItem: TimetableItemDetail | null = null;

  // Form Data
  timetableForm = { name: '', isActive: false };
  itemForm = {
    taskCategoryId: 0,
    taskSubtypeId: null as number | null,
    dayOfWeek: 0,
    startTime: '',
    endTime: ''
  };

  // Calendar Data
  daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  timeSlots: string[] = [];

  loading = false;
  errorMessage = '';

  windowWidth: number = window.innerWidth;
  activeMobileDayIndex: number = new Date().getDay();

  constructor(
    private timetableService: TimetableService,
    private timetableItemService: TimetableItemService,
    private taskCategoryService: TaskCategoryService,
    private taskSubtypeService: TaskSubtypeService
  ) {
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    await this.loadTimetables();
    await this.loadTaskCategories();
    await this.loadTaskSubtypes();
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
    this.windowWidth = event.target.innerWidth;
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
      this.timetables = await this.timetableService.getAll();
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = 'Failed to load timetables';
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
    if (timetable) {
      this.editingTimetable = timetable;
      this.timetableForm = { name: timetable.name, isActive: timetable.isActive };
    } else {
      this.editingTimetable = null;
      this.timetableForm = { name: '', isActive: false };
    }
    this.showTimetableForm = true;
  }

  async saveTimetable(): Promise<void> {
    if (!this.timetableForm.name.trim()) {
      this.errorMessage = 'Timetable name is required';
      return;
    }

    try {
      let timetableId: number | null = this.editingTimetable?.id ?? null;

      if (this.editingTimetable) {
        await this.timetableService.update(this.editingTimetable.id, this.timetableForm);
      } else {
        const created = await this.timetableService.create(this.timetableForm);
        timetableId = created.id;
      }

      if (this.timetableForm.isActive && timetableId) {
        await this.timetableService.activate(timetableId);
      }

      await this.loadTimetables();
      this.closeTimetableForm();
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = `Failed to ${this.editingTimetable ? 'update' : 'create'} timetable`;
      console.error('Error saving timetable:', error);
    }
  }

  async deleteTimetable(id: number): Promise<void> {
    if (confirm('Are you sure you want to delete this timetable?')) {
      try {
        await this.timetableService.delete(id);
        await this.loadTimetables();
        if (this.selectedTimetable?.id === id) {
          this.selectedTimetable = null;
          this.timetableItems = [];
        }
      } catch (err: unknown) {
        const error = err as Error;
        this.errorMessage = 'Failed to delete timetable';
        console.error('Error deleting timetable:', error);
      }
    }
  }

  async activateTimetable(id: number): Promise<void> {
    try {
      await this.timetableService.activate(id);
      await this.loadTimetables();
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
  }

  // Timetable Item CRUD
  openItemForm(item?: TimetableItemDetail): void {
    if (!this.selectedTimetable) return;

    if (item) {
      this.editingItem = item;
      this.itemForm = {
        taskCategoryId: item.taskCategoryId,
        taskSubtypeId: item.taskSubtypeId || null,
        dayOfWeek: item.dayOfWeek,
        startTime: this.convertTimeStringTo12Hour(item.startTime),
        endTime: this.convertTimeStringTo12Hour(item.endTime)
      };
    } else {
      this.editingItem = null;
      this.itemForm = {
        taskCategoryId: 0,
        taskSubtypeId: null,
        dayOfWeek: 0,
        startTime: '',
        endTime: ''
      };
    }
    this.showItemForm = true;
  }

  async saveItem(): Promise<void> {
    if (!this.selectedTimetable || !this.itemForm.taskCategoryId || !this.itemForm.startTime || !this.itemForm.endTime) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    const startTime24 = this.convertTime12to24(this.itemForm.startTime);
    const endTime24 = this.convertTime12to24(this.itemForm.endTime);

    if (!startTime24 || !endTime24) {
      this.errorMessage = 'Please enter valid start and end times.';
      return;
    }

    const startMinutes = this.timeToMinutes(startTime24);
    const endMinutes = this.timeToMinutes(endTime24);

    if (startMinutes >= endMinutes) {
      this.errorMessage = 'Start time must be before end time';
      return;
    }

    // Check for overlapping time slots
    if (this.hasOverlap(this.itemForm.dayOfWeek, startTime24, endTime24, this.editingItem?.id)) {
      this.errorMessage = 'This time slot overlaps with an existing entry';
      return;
    }

    const itemData = {
      timetableId: this.selectedTimetable.id,
      taskCategoryId: this.itemForm.taskCategoryId,
      taskSubtypeId: this.itemForm.taskSubtypeId,
      dayOfWeek: this.itemForm.dayOfWeek,
      startTime: startTime24,
      endTime: endTime24
    };

    try {
      if (this.editingItem) {
        await this.timetableItemService.update(this.editingItem.id, itemData);
      } else {
        await this.timetableItemService.create(itemData);
      }
      await this.loadTimetableItems(this.selectedTimetable.id);
      this.closeItemForm();
    } catch (err: unknown) {
      const error = err as Error;
      this.errorMessage = `Failed to ${this.editingItem ? 'update' : 'create'} item`;
      console.error('Error saving item:', error);
    }
  }

  async deleteItem(id: number): Promise<void> {
    if (!this.selectedTimetable) return;

    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await this.timetableItemService.delete(id);
        await this.loadTimetableItems(this.selectedTimetable.id);
      } catch (err: unknown) {
        const error = err as Error;
        this.errorMessage = 'Failed to delete item';
        console.error('Error deleting item:', error);
      }
    }
  }

  closeItemForm(): void {
    this.showItemForm = false;
    this.editingItem = null;
    this.errorMessage = '';
  }

  hasOverlap(dayOfWeek: number, startTime: string, endTime: string, excludeId?: number): boolean {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    const itemsOnDay = this.timetableItems.filter(
      item => item.dayOfWeek === dayOfWeek && item.id !== excludeId
    );

    for (const item of itemsOnDay) {
      const existingStart = this.timeToMinutes(item.startTime);
      const existingEnd = this.timeToMinutes(item.endTime);

      if (
        (startMinutes >= existingStart && startMinutes < existingEnd) ||
        (endMinutes > existingStart && endMinutes <= existingEnd) ||
        (startMinutes <= existingStart && endMinutes >= existingEnd)
      ) {
        return true;
      }
    }
    return false;
  }

  // Calendar View Helpers
  getItemsForDay(dayOfWeek: number): TimetableItemDetail[] {
    return this.timetableItems.filter(item => item.dayOfWeek === dayOfWeek);
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

  getItemPosition(item: TimetableItemDetail): { top: number; height: number } {
    const startMinutes = this.timeToMinutes(item.startTime);
    const endMinutes = this.timeToMinutes(item.endTime);
    const duration = endMinutes - startMinutes;

    const pixelsPerMinute = 2; // Adjust for visual scaling
    return {
      top: (startMinutes / 30) * 40, // 40px per 30-minute block
      height: (duration / 30) * 40
    };
  }

  deselectTimetable(): void {
    this.selectedTimetable = null;
    this.timetableItems = [];
  }

  // Helper method for keyvalue pipe in template
  Object = Object;
}
