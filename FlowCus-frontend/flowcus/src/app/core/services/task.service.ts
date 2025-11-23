import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Task } from '../models/task.model';
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
    return this.api.post<Task>(API_ENDPOINTS.TASKS, data);
  }

  update(id: number, data: Partial<Task>) {
    return this.api.put<Task>(`${API_ENDPOINTS.TASKS}/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`${API_ENDPOINTS.TASKS}/${id}`);
  }
}