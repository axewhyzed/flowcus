import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private api: ApiService) {}

  getUser(id: number) {
    return this.api.get<User>(`users/${id}`);
  }

  updateUser(id: number, data: Partial<User>) {
    return this.api.put<User>(`users/${id}`, data);
  }
}
