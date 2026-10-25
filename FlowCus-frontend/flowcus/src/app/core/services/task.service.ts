import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Task, TaskCreateResponse, TaskPatch } from '../models/task.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<Task[]>(API_ENDPOINTS.TASKS);
  }

  get(id: number) {
    return this.api.get<Task>(`${API_ENDPOINTS.TASKS}/${id}`);
  }

  create(data: Partial<Task>) {
    return this.api.post<TaskCreateResponse>(API_ENDPOINTS.TASKS, data);
  }

  /** Apply a partial update without sending unrelated form fields. */
  updatePartial(id: number, patch: TaskPatch) {
    return this.api.patch<{ message: string }>(`${API_ENDPOINTS.TASKS}/${id}`, patch);
  }

  toggleComplete(id: number, isCompleted?: boolean) {
    return this.api.patch<{ message: string; taskId: number }>(
      `${API_ENDPOINTS.TASKS}/${id}/toggle-complete`, 
      { isCompleted }
    );
  }

  rolloverYesterday() {
    return this.api.post<{ rolledOverCount: number; message: string }>(
      `${API_ENDPOINTS.TASKS}/rollover-yesterday`, 
      {}
    );
  }

  delete(id: number) {
    return this.api.delete<any>(`${API_ENDPOINTS.TASKS}/${id}`);
  }
}
