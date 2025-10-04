import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TaskSubtype } from '../models/task-subtype.model';

@Injectable({
  providedIn: 'root'
})
export class TaskSubtypeService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<TaskSubtype[]>('task-subtypes');
  }

  get(id: number) {
    return this.api.get<TaskSubtype>(`task-subtypes/${id}`);
  }

  create(data: Partial<TaskSubtype>) {
    return this.api.post<TaskSubtype>('task-subtypes', data);
  }

  update(id: number, data: Partial<TaskSubtype>) {
    return this.api.put<TaskSubtype>(`task-subtypes/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`task-subtypes/${id}`);
  }
}
