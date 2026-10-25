jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: { put: jest.fn(), post: jest.fn(), delete: jest.fn(), get: jest.fn() },
}));

import apiClient from '../src/services/apiClient';
import timetableReducer, { fetchTimetableItems, fetchTimetables, updateTimetableItem } from '../src/redux/slices/timetable';

describe('updateTimetableItem', () => {
  it('sends the date field unchanged when editing a one-off schedule item', async () => {
    const item = {
      timetableId: 2,
      taskCategoryId: 3,
      taskSubtypeId: null,
      dayOfWeek: 2,
      startTime: '09:00:00',
      endTime: '10:00:00',
      specificDate: '2026-10-27',
    };
    const dispatch = jest.fn();
    (apiClient.put as jest.Mock).mockResolvedValue({ data: { message: 'Item updated' } });

    const result = await updateTimetableItem({ id: 20, item })(dispatch, () => ({} as never), undefined);

    expect(apiClient.put).toHaveBeenCalledWith('/timetable/items/20', item);
    expect(result.payload).toMatchObject({ id: 20, specificDate: '2026-10-27' });
  });
});

describe('timetable loading state', () => {
  it('ends loading and exposes errors for schedules and schedule items', () => {
    const loading = timetableReducer(undefined, fetchTimetables.pending('request-1'));
    expect(loading.isLoading).toBe(true);
    const scheduleFailed = timetableReducer(loading, fetchTimetables.rejected(new Error('offline'), 'request-1'));
    expect(scheduleFailed.isLoading).toBe(false);
    expect(scheduleFailed.error).toBe('offline');

    const itemLoading = timetableReducer(scheduleFailed, fetchTimetableItems.pending('request-2', 3));
    const itemsFailed = timetableReducer(itemLoading, fetchTimetableItems.rejected(new Error('timeout'), 'request-2', 3));
    expect(itemsFailed.isLoading).toBe(false);
    expect(itemsFailed.error).toBe('timeout');
  });
});
