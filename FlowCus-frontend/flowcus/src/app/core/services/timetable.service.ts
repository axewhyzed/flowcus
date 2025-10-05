import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Timetable } from '../models/timetable.model';

@Injectable({
  providedIn: 'root'
})
export class TimetableService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<Timetable[]>('timetable');
  }

  get(id: number) {
    return this.api.get<Timetable>(`timetable/${id}`);
  }

  create(data: Partial<Timetable>) {
    return this.api.post<Timetable>('timetable', data);
  }

  update(id: number, data: Partial<Timetable>) {
    return this.api.put<Timetable>(`timetable/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`timetable/${id}`);
  }

  activate(id: number) {
    return this.api.post<any>(`timetable/${id}/activate`);
  }
}
