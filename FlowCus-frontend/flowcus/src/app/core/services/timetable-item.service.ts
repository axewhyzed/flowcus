import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TimetableItem } from '../models/timetable-item.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class TimetableItemService {
  constructor(private api: ApiService) {}

  // FIX: Must pass the timetableId to get its items
  getItems(timetableId: number) {
    return this.api.get<TimetableItem[]>(`${API_ENDPOINTS.TIMETABLE}/${timetableId}/items`);
  }

  // Backend: POST api/timetable/items
  create(data: Partial<TimetableItem>) {
    return this.api.post<TimetableItem>(`${API_ENDPOINTS.TIMETABLE}/items`, data);
  }

  // Backend: PUT api/timetable/items/{id}
  update(id: number, data: Partial<TimetableItem>) {
    return this.api.put<TimetableItem>(`${API_ENDPOINTS.TIMETABLE}/items/${id}`, data);
  }

  // Backend: DELETE api/timetable/items/{id}
  delete(id: number) {
    return this.api.delete<any>(`${API_ENDPOINTS.TIMETABLE}/items/${id}`);
  }
}