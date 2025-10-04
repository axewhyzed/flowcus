import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<Task[]>('tasks');
  }

  get(id: number) {
    return this.api.get<Task>(`tasks/${id}`);
  }

  create(data: Partial<Task>) {
    return this.api.post<Task>('tasks', data);
  }

  update(id: number, data: Partial<Task>) {
    return this.api.put<Task>(`tasks/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`tasks/${id}`);
  }
}
