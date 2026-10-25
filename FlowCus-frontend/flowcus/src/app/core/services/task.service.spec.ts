import { TaskService } from './task.service';
import { ApiService } from './api.service';

describe('TaskService', () => {
  it('uses PATCH for partial task updates and sends only the requested fields', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['patch']);
    api.patch.and.returnValue(Promise.resolve({ message: 'Task updated' }));
    const service = new TaskService(api);

    await service.updatePartial(42, { priority: 1 });

    expect(api.patch).toHaveBeenCalledOnceWith('tasks/42', { priority: 1 });
  });

  it('supports an explicit null to clear an optional task date', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['patch']);
    api.patch.and.returnValue(Promise.resolve({ message: 'Task updated' }));
    const service = new TaskService(api);

    await service.updatePartial(42, { startTime: null });

    expect(api.patch).toHaveBeenCalledOnceWith('tasks/42', { startTime: null });
  });
});
