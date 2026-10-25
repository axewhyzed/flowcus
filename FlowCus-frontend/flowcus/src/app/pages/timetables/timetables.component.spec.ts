import { ActiveBlockService } from '../../core/services/active-block.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskService } from '../../core/services/task.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { TimetableItemService } from '../../core/services/timetable-item.service';
import { TimetableService } from '../../core/services/timetable.service';
import { ToastService } from '../../core/services/toast.service';
import { Timetable } from '../../core/models/timetable.model';
import { TimetableItem } from '../../core/models/timetable-item.model';
import { TimetablesComponent } from './timetables.component';

describe('TimetablesComponent date-specific blocks', () => {
  let itemService: jasmine.SpyObj<TimetableItemService>;
  let component: TimetablesComponent;

  function createItem(overrides: Partial<TimetableItem> = {}): TimetableItem {
    return {
      id: 1,
      timetableId: 7,
      taskCategoryId: 3,
      taskSubtypeId: null,
      dayOfWeek: 6,
      startTime: '10:00:00',
      endTime: '11:00:00',
      specificDate: null,
      isDeleted: false,
      ...overrides
    };
  }

  function createComponent(items: TimetableItem[] = [], timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['getAll'])): TimetablesComponent {
    timetableService.getAll.and.returnValue(Promise.resolve([]));
    itemService = jasmine.createSpyObj<TimetableItemService>('TimetableItemService', ['getItems', 'create', 'update', 'delete']);
    itemService.getItems.and.returnValue(Promise.resolve(items));
    itemService.create.and.returnValue(Promise.resolve(createItem({ id: 99 })));
    itemService.update.and.returnValue(Promise.resolve(createItem()));
    const activeBlockService = jasmine.createSpyObj<ActiveBlockService>('ActiveBlockService', ['refresh']);
    activeBlockService.refresh.and.returnValue(Promise.resolve());
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['warning', 'successFrom', 'success', 'error']);

    const instance = new TimetablesComponent(
      'server' as Object,
      timetableService,
      itemService,
      {} as TaskCategoryService,
      {} as TaskSubtypeService,
      toast,
      {} as ConfirmService,
      {} as TaskService,
      activeBlockService
    );
    instance.selectedTimetable = { id: 7, name: 'My timetable', isActive: true } as Timetable;
    instance.timetableItems = items;
    return instance;
  }

  it('keeps one-off items out of weekly columns and lists them as date-only items', () => {
    const weekly = createItem({ id: 1, dayOfWeek: 6 });
    const oneOff = createItem({ id: 2, dayOfWeek: 6, specificDate: '2026-10-24' });
    component = createComponent([weekly, oneOff]);

    expect(component.getItemsForDay(6).map(item => item.id)).toEqual([1]);
    expect(component.getOneOffItems().map(item => item.id)).toEqual([2]);
    expect(component.formatSpecificDate('2026-10-24')).toContain('2026');
  });

  it('preserves an existing specific date through edit and sends it as a date-only value', async () => {
    const oneOff = createItem({ id: 2, dayOfWeek: 0, specificDate: '2026-10-24' });
    component = createComponent([]);
    component.openItemForm(oneOff);
    component.itemForm.taskCategoryId = oneOff.taskCategoryId;

    await component.saveItem();

    expect(itemService.update).toHaveBeenCalled();
    const updatePayload = itemService.update.calls.mostRecent().args[1];
    expect(updatePayload.specificDate).toBe('2026-10-24');
    expect(updatePayload.dayOfWeek).toBe(new Date(2026, 9, 24).getDay());
  });

  it('turns a one-off into a weekly block only when the date is explicitly cleared', async () => {
    const oneOff = createItem({ id: 2, dayOfWeek: 6, specificDate: '2026-10-24' });
    component = createComponent([]);
    component.openItemForm(oneOff);
    component.itemForm.taskCategoryId = oneOff.taskCategoryId;
    component.setSpecificDate('');

    await component.saveItem();

    const updatePayload = itemService.update.calls.mostRecent().args[1];
    expect(updatePayload.specificDate).toBeNull();
    expect(updatePayload.dayOfWeek).toBe(6);
  });

  it('checks one-off conflicts against the same date and recurring blocks on that weekday', () => {
    const saturdayRecurring = createItem({ id: 1, dayOfWeek: 6 });
    const saturdayOneOff = createItem({ id: 2, dayOfWeek: 6, specificDate: '2026-10-24' });
    component = createComponent([saturdayRecurring, saturdayOneOff]);

    expect(component.hasOverlap(6, '10:30:00', '11:30:00', undefined, '2026-10-24')).toBeTrue();
    expect(component.hasOverlap(0, '10:30:00', '11:30:00', undefined, '2026-10-25')).toBeFalse();
    expect(component.hasOverlap(6, '10:30:00', '11:30:00')).toBeTrue();
    expect(component.hasOverlap(6, '11:00:00', '12:00:00')).toBeFalse();
  });

  it('keeps timetable-load failures distinct from a successfully loaded empty list', async () => {
    const timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['getAll']);
    timetableService.getAll.and.returnValue(Promise.reject(new Error('offline')));
    component = createComponent([], timetableService);
    timetableService.getAll.and.returnValue(Promise.reject(new Error('offline')));

    await component.loadTimetables();

    expect(component.timetables).toEqual([]);
    expect(component.loadErrorMessage).toContain('could not load');
    expect(component.loading).toBeFalse();
  });
});
