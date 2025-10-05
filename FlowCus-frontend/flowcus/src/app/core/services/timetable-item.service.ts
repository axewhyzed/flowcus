import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TimetableItem } from '../models/timetable-item.model';

@Injectable({
  providedIn: 'root'
})
export class TimetableItemService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<TimetableItem[]>('timetableitem');
  }

  get(id: number) {
    return this.api.get<TimetableItem>(`timetableitem/${id}`);
  }

  create(data: Partial<TimetableItem>) {
    return this.api.post<TimetableItem>('timetableitem', data);
  }

  update(id: number, data: Partial<TimetableItem>) {
    return this.api.put<TimetableItem>(`timetableitem/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<any>(`timetableitem/${id}`);
  }
}
