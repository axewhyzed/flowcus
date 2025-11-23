import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models/user.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) { }

  getUser(id: number) {
    return this.api.get<User>(`${API_ENDPOINTS.USERS}/${id}`);
  }

  getMyUser() {
    return this.api.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  updateUser(data: Partial<User>) {
    return this.api.put<User>(API_ENDPOINTS.USERS, data);
  }
}