// // tasks.service.ts
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment';
// import { Task } from '../models/task.model'

// @Injectable({
//   providedIn: 'root'
// })
// export class TasksService {
//   private apiUrl = `${environment.apiUrl}/Tasks`;

//   constructor(private http: HttpClient) {}

//   // Get all active tasks
//   getTasks(): Observable<Task[]> {
//     return this.http.get<Task[]>(this.apiUrl);
//   }

//   // Get a specific task by ID
//   getTask(id: number): Observable<Task> {
//     return this.http.get<Task>(`${this.apiUrl}/${id}`);
//   }

//   // Create a new task
//   addTask(task: Task): Observable<Task> {
//     return this.http.post<Task>(this.apiUrl, task);
//   }

//   // Update an existing task
//   updateTask(id: number, task: Task): Observable<void> {
//     return this.http.put<void>(`${this.apiUrl}/${id}`, task);
//   }

//   // Soft delete a task
//   deleteTask(id: number): Observable<void> {
//     return this.http.delete<void>(`${this.apiUrl}/${id}`);
//   }
// }

import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(private apiService: ApiService) { }

  async getAllTasks(): Promise<Task[]> {
    return this.apiService.get<Task[]>('/tasks');
  }

  async getTaskById(id: number): Promise<Task> {
    return this.apiService.get<Task>(`/tasks/${id}`);
  }

  async createTask(task: Task): Promise<Task> {
    return this.apiService.post<Task>('/tasks', task);
  }

  async updateTask(id: number, task: Partial<Task>): Promise<{ updatedTaskId: number }> {
    return this.apiService.patch<{ updatedTaskId: number }>(`/tasks/${id}`, task);
  }

  async deleteTask(id: number): Promise<{ updatedTaskId: number }> {
    return this.apiService.patch<{ updatedTaskId: number }>(`/tasks/${id}`, { isDeleted: true });
  }

  async toggleTaskCompletion(id: number, isCompleted: boolean): Promise<{ updatedTaskId: number }> {
    return this.apiService.patch<{ updatedTaskId: number }>(`/tasks/${id}`, { isCompleted });
  }
}

