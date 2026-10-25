import { TimetableService } from './timetable.service';
import { ApiService } from './api.service';

describe('TimetableService', () => {
  it('includes the selected timetable when shifting its schedule', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['post']);
    api.post.and.returnValue(Promise.resolve({ shiftedCount: 2, message: 'Shifted' }));
    const service = new TimetableService(api);

    await service.shiftToday(15, 5, 42);

    expect(api.post).toHaveBeenCalledOnceWith('timetable/shift-today', {
      minutes: 15,
      dayOfWeek: 5,
      timetableId: 42
    });
  });
});
