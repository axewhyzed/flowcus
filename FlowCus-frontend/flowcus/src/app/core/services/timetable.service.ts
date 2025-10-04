import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Timetable } from '../models/timetable.model';

@Injectable({
  providedIn: 'root'
})
export class TimetableService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<Timetable[]>('timetables');
  }

  get(id: number) {
    return this.api.get<Timetable>(`timetables/${id}`);
  }

  create(data: Partial<Timetable>) {
    return this.api.post<Timetable>('timetables', data);
  }

  update(id: number, data: Partial<Timetable>) {
    return this.api.put<Timetable>(`timetables/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`timetables/${id}`);
  }

  activate(id: number) {
    return this.api.post<any>(`timetables/${id}/activate`);
  }
}
