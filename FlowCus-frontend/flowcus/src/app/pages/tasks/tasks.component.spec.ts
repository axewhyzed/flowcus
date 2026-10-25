import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TasksComponent } from './tasks.component';
import { TaskService } from '../../core/services/task.service';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { NlpTaskParserService } from '../../core/services/nlp-task-parser.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

describe('TasksComponent', () => {
  function createComponent(taskService = jasmine.createSpyObj<TaskService>('TaskService', ['create', 'getAll'])): TasksComponent {
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['warning', 'successFrom', 'error']);
    return new TasksComponent(
      taskService,
      {} as TaskCategoryService,
      {} as TaskSubtypeService,
      {} as NlpTaskParserService,
      { queryParams: of({}) } as unknown as ActivatedRoute,
      toast,
      {} as ConfirmService
    );
  }

  it('clears a subtype that does not belong to the changed category', () => {
    const component = createComponent();
    component.subcategories = [
      { id: 11, categoryId: 1, userId: 4, name: 'Writing', createdOn: '', isDeleted: false },
      { id: 22, categoryId: 2, userId: 4, name: 'Planning', createdOn: '', isDeleted: false }
    ];
    component.newTask.taskSubtypeId = 11;

    component.onTaskCategoryChange(2);

    expect(component.newTask.taskSubtypeId).toBeNull();
  });

  it('serializes datetime-local task values as local instants before saving', async () => {
    const taskService = jasmine.createSpyObj<TaskService>('TaskService', ['create', 'getAll']);
    taskService.create.and.returnValue(Promise.resolve({ id: 1, message: 'Task created' }));
    taskService.getAll.and.returnValue(Promise.resolve([]));
    const component = createComponent(taskService);
    component.newTask = {
      title: 'Write report',
      taskCategoryId: 3,
      priority: 2,
      startTime: '2026-10-24T09:30',
      endTime: '2026-10-24T10:00'
    };

    await component.saveTask();

    expect(taskService.create).toHaveBeenCalledWith(jasmine.objectContaining({
      startTime: new Date('2026-10-24T09:30').toISOString(),
      endTime: new Date('2026-10-24T10:00').toISOString()
    }));
  });

  it('keeps the Today counter consistent with Today view for unscheduled tasks created today', () => {
    const component = createComponent();
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const todayTask = {
      taskId: 1,
      taskCategoryId: 1,
      createdBy: 1,
      createdOn: today.toISOString(),
      title: 'Unscheduled task',
      isDeleted: false,
      isCompleted: false
    };
    component.tasks = [todayTask];
    component.activeView = 'today';

    expect(component.countToday).toBe(1);
    expect(component.filteredTasks.map(task => task.taskId)).toEqual([1]);
  });

  it('keeps task-load failures distinct from a successfully loaded empty list', async () => {
    const taskService = jasmine.createSpyObj<TaskService>('TaskService', ['create', 'getAll']);
    taskService.getAll.and.returnValue(Promise.reject(new Error('offline')));
    const component = createComponent(taskService);

    await component.loadTasks();

    expect(component.tasks).toEqual([]);
    expect(component.taskLoadError).toContain('could not load');
    expect(component.isLoadingTasks).toBeFalse();
  });
});
