import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TaskCategory } from '../models/task-category.model';

@Injectable({
  providedIn: 'root'
})
export class TaskCategoryService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<TaskCategory[]>('taskcategory');
  }

  get(id: number) {
    return this.api.get<TaskCategory>(`task-category/${id}`);
  }

  create(data: Partial<TaskCategory>) {
    return this.api.post<TaskCategory>('task-category', data);
  }

  update(id: number, data: Partial<TaskCategory>) {
    return this.api.put<TaskCategory>(`task-category/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`task-category/${id}`);
  }
}
