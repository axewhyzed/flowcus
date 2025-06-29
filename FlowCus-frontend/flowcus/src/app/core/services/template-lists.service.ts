// template-lists.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TemplateList } from '../models/template-list.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateListsService {
  private apiUrl = `${environment.apiUrl}/TemplateLists`;

  constructor(private http: HttpClient) {}

  // Get all templates for a user
  getTemplates(userId: number): Observable<TemplateList[]> {
    return this.http.get<TemplateList[]>(`${this.apiUrl}?userId=${userId}`);
  }

  // Get a specific template by ID
  getTemplate(id: number): Observable<TemplateList> {
    return this.http.get<TemplateList>(`${this.apiUrl}/${id}`);
  }

  // Create a new timetable template
  addTemplate(template: TemplateList): Observable<any> {
    return this.http.post(this.apiUrl, template);
  }

  // Update a template's name
  updateTemplate(id: number, template: TemplateList): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, template);
  }

  // Soft delete a template
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
