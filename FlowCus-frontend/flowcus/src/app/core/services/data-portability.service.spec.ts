import { DataPortabilityService } from './data-portability.service';
import { TaskService } from './task.service';
import { TimetableService } from './timetable.service';
import { TimetableItemService } from './timetable-item.service';
import { TaskCategoryService } from './task-category.service';
import { TaskSubtypeService } from './task-subtype.service';
import { ToastService } from './toast.service';

describe('DataPortabilityService', () => {
  it('exports timetable items with the other user data', async () => {
    const tasks = { getAll: () => Promise.resolve([{ taskId: 1, title: 'Write report' }]) };
    const categories = { getAll: () => Promise.resolve([{ id: 2, name: 'Work' }]) };
    const subtypes = { getAll: () => Promise.resolve([]) };
    const timetables = { getAll: () => Promise.resolve([{ id: 9, name: 'Week', isActive: true }]) };
    const items = { getItems: jasmine.createSpy().and.returnValue(Promise.resolve([{ id: 17, timetableId: 9 }])) };
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    const service = new DataPortabilityService(
      tasks as unknown as TaskService,
      timetables as unknown as TimetableService,
      items as unknown as TimetableItemService,
      categories as unknown as TaskCategoryService,
      subtypes as unknown as TaskSubtypeService,
      toast
    );
    let downloaded: Blob | undefined;
    spyOn(service as any, 'downloadFile').and.callFake((blob: Blob) => downloaded = blob);

    await service.exportJson();

    expect(items.getItems).toHaveBeenCalledOnceWith(9);
    expect(downloaded).toBeDefined();
    const backup = JSON.parse(await downloaded!.text());
    expect(backup.timetableItems).toEqual([{ id: 17, timetableId: 9 }]);
    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not report a partial backup as a successful export', async () => {
    const tasks = { getAll: () => Promise.resolve([]) };
    const categories = { getAll: () => Promise.resolve([]) };
    const subtypes = { getAll: () => Promise.resolve([]) };
    const timetables = { getAll: () => Promise.resolve([{ id: 9 }]) };
    const items = { getItems: () => Promise.reject(new Error('Network error')) };
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    const service = new DataPortabilityService(
      tasks as unknown as TaskService,
      timetables as unknown as TimetableService,
      items as unknown as TimetableItemService,
      categories as unknown as TaskCategoryService,
      subtypes as unknown as TaskSubtypeService,
      toast
    );
    const download = spyOn(service as any, 'downloadFile');

    await service.exportJson();

    expect(download).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to generate full backup');
  });
});
