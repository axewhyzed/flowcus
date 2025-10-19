// admin.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    constructor(private api: ApiService) { }

    /**
     * Get all users (for admin dashboard)
     */
    getAllUsers(): Promise<User[]> {
        return this.api.get<User[]>('admin/users');
    }

    /**
     * Get a single user by ID
     */
    getUser(id: number): Promise<User> {
        return this.api.get<User>(`admin/users/${id}`);
    }

    /**
     * Delete a user by ID
     */
    deleteUser(id: number): Promise<any> {
        return this.api.delete(`admin/users/${id}`);
    }

    /**
   * Create a new user
   */
    createUser(data: Partial<User>): Promise<User> {
        return this.api.post<User>('admin/users', data);
    }

    // Update an existing user
    updateUser(id: number, data: Partial<User>): Promise<User> {
        return this.api.put<User>(`admin/users/${id}`, data);
    }
}
