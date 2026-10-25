import { BehaviorSubject } from 'rxjs';
import { ActiveBlockService } from './active-block.service';
import { TimetableService } from './timetable.service';
import { TimetableItemService } from './timetable-item.service';
import { TaskCategoryService } from './task-category.service';
import { TaskSubtypeService } from './task-subtype.service';
import { AuthService } from './auth.service';
import { localDateKey } from '../utils/local-date-time';

describe('ActiveBlockService schedule selection', () => {
  function createService(timetables: unknown[], items: unknown[]) {
    let authenticated = false;
    const authState$ = new BehaviorSubject<boolean>(false);
    const auth = {
      isAuthenticated$: authState$,
      get isAuthenticated() { return authenticated; }
    };
    const timetableService = {
      getAll: () => Promise.resolve(timetables)
    };
    const itemService = {
      getItems: jasmine.createSpy().and.returnValue(Promise.resolve(items))
    };
    const categoryService = { getAll: () => Promise.resolve([]) };
    const subtypeService = { getAll: () => Promise.resolve([]) };
    const service = new ActiveBlockService(
      timetableService as unknown as TimetableService,
      itemService as unknown as TimetableItemService,
      categoryService as unknown as TaskCategoryService,
      subtypeService as unknown as TaskSubtypeService,
      auth as unknown as AuthService
    );
    authenticated = true;
    authState$.next(true);
    return { service, itemService, refresh: () => service.refresh() };
  }

  it('does not use the first inactive timetable as the active schedule', async () => {
    const { service, itemService, refresh } = createService([
      { id: 4, isActive: false, isDeleted: false }
    ], [{ id: 99, dayOfWeek: new Date().getDay(), isDeleted: false }]);
    const activeValues: unknown[] = [];
    const sub = service.activeBlock$.subscribe(value => activeValues.push(value));

    await refresh();

    expect(itemService.getItems).not.toHaveBeenCalled();
    expect(activeValues[activeValues.length - 1]).toBeNull();
    service.ngOnDestroy();
    sub.unsubscribe();
  });

  it('uses specific-date entries only on their local calendar date', async () => {
    const now = new Date();
    const today = localDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = localDateKey(yesterday);
    const currentDay = now.getDay();
    const otherDay = (currentDay + 6) % 7;
    const { service, refresh } = createService([
      { id: 4, isActive: true, isDeleted: false }
    ], [
      { id: 1, dayOfWeek: currentDay, specificDate: null, isDeleted: false },
      { id: 2, dayOfWeek: otherDay, specificDate: today, isDeleted: false },
      { id: 3, dayOfWeek: currentDay, specificDate: yesterdayKey, isDeleted: false },
      { id: 4, dayOfWeek: otherDay, specificDate: null, isDeleted: false }
    ]);

    await refresh();

    expect((service as any).todayItems.map((item: { id: number }) => item.id).sort()).toEqual([1, 2]);
    service.ngOnDestroy();
  });
});
