import { Subject } from 'rxjs';
import { Task } from '../../../core/models/task.model';
import { DailyRitualService } from '../../../core/services/daily-ritual.service';
import { SoundFeedbackService } from '../../../core/services/sound-feedback.service';
import { TaskService } from '../../../core/services/task.service';
import { ToastService } from '../../../core/services/toast.service';
import { EveningShutdownModalComponent } from './evening-shutdown-modal.component';

describe('EveningShutdownModalComponent', () => {
  let modalOpen$: Subject<boolean>;
  let taskService: jasmine.SpyObj<TaskService>;
  let component: EveningShutdownModalComponent;

  function task(overrides: Partial<Task>): Task {
    return {
      taskId: 1,
      taskCategoryId: 1,
      createdBy: 1,
      createdOn: new Date().toISOString(),
      isDeleted: false,
      isCompleted: true,
      ...overrides
    };
  }

  function localDayAt(dayOffset: number, hour: number, minute = 0): string {
    const value = new Date();
    value.setDate(value.getDate() + dayOffset);
    value.setHours(hour, minute, 0, 0);
    return value.toISOString();
  }

  beforeEach(() => {
    modalOpen$ = new Subject<boolean>();
    taskService = jasmine.createSpyObj<TaskService>('TaskService', ['getAll']);
    const ritualService = {
      eveningModal$: modalOpen$,
      closeEveningShutdown: jasmine.createSpy('closeEveningShutdown'),
      completeEveningShutdown: jasmine.createSpy('completeEveningShutdown')
    } as unknown as DailyRitualService;
    const soundService = jasmine.createSpyObj<SoundFeedbackService>('SoundFeedbackService', ['playClick', 'playCelebration']);
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    component = new EveningShutdownModalComponent(ritualService, taskService, soundService, toastService);
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('counts completions by completedOn within the local day, not by later edits', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    taskService.getAll.and.returnValue(Promise.resolve([
      task({ taskId: 1, completedOn: todayStart.toISOString(), updatedOn: localDayAt(-1, 22) }),
      task({ taskId: 2, completedOn: localDayAt(-1, 23), updatedOn: localDayAt(0, 10) }),
      task({ taskId: 3, completedOn: tomorrowStart.toISOString(), updatedOn: localDayAt(0, 11) }),
      task({ taskId: 4, completedOn: null, updatedOn: localDayAt(0, 12) })
    ]));

    modalOpen$.next(true);
    await Promise.resolve();

    expect(component.completedToday.map(item => item.taskId)).toEqual([1]);
  });
});
