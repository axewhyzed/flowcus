import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TimetableItem } from '../models/timetable-item.model';

@Injectable({
  providedIn: 'root'
})
export class TimetableItemService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<TimetableItem[]>('timetable-items');
  }

  get(id: number) {
    return this.api.get<TimetableItem>(`timetable-items/${id}`);
  }

  create(data: Partial<TimetableItem>) {
    return this.api.post<TimetableItem>('timetable-items', data);
  }

  update(id: number, data: Partial<TimetableItem>) {
    return this.api.put<TimetableItem>(`timetable-items/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`timetable-items/${id}`);
  }
}
