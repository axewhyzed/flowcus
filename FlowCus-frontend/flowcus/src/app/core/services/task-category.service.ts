import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TaskCategory } from '../models/task-category.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class TaskCategoryService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<TaskCategory[]>(API_ENDPOINTS.TASK_CATEGORY);
  }

  get(id: number) {
    return this.api.get<TaskCategory>(`${API_ENDPOINTS.TASK_CATEGORY}/${id}`);
  }

  create(data: Partial<TaskCategory>) {
    return this.api.post<TaskCategory>(API_ENDPOINTS.TASK_CATEGORY, data);
  }

  update(id: number, data: Partial<TaskCategory>) {
    return this.api.put<TaskCategory>(`${API_ENDPOINTS.TASK_CATEGORY}/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`${API_ENDPOINTS.TASK_CATEGORY}/${id}`);
  }
}