import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TaskSubtype } from '../models/task-subtype.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class TaskSubtypeService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<TaskSubtype[]>(API_ENDPOINTS.TASK_SUBTYPE);
  }

  get(id: number) {
    return this.api.get<TaskSubtype>(`${API_ENDPOINTS.TASK_SUBTYPE}/${id}`);
  }

  create(data: Partial<TaskSubtype>) {
    return this.api.post<TaskSubtype>(API_ENDPOINTS.TASK_SUBTYPE, data);
  }

  update(id: number, data: Partial<TaskSubtype>) {
    return this.api.put<TaskSubtype>(`${API_ENDPOINTS.TASK_SUBTYPE}/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`${API_ENDPOINTS.TASK_SUBTYPE}/${id}`);
  }
}