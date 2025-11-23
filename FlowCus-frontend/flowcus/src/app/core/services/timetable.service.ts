import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Timetable } from '../models/timetable.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<Timetable[]>(API_ENDPOINTS.TIMETABLE);
  }

  get(id: number) {
    return this.api.get<Timetable>(`${API_ENDPOINTS.TIMETABLE}/${id}`);
  }

  create(data: Partial<Timetable>) {
    return this.api.post<Timetable>(API_ENDPOINTS.TIMETABLE, data);
  }

  update(id: number, data: Partial<Timetable>) {
    return this.api.put<Timetable>(`${API_ENDPOINTS.TIMETABLE}/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`${API_ENDPOINTS.TIMETABLE}/${id}`);
  }

  activate(id: number) {
    return this.api.post<any>(`${API_ENDPOINTS.TIMETABLE}/${id}/activate`, {});
  }
}