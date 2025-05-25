// template-items.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { TemplateItem } from '../app/models/template-item.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateItemsService {
  private apiUrl = `${environment.apiUrl}/TemplateItems`;

  constructor(private http: HttpClient) {}

  // Get all items in a template
  getTemplateItems(templateId: number): Observable<TemplateItem[]> {
    return this.http.get<TemplateItem[]>(`${this.apiUrl}?templateId=${templateId}`);
  }

  // Get a specific template item by ID
  getTemplateItem(id: number): Observable<TemplateItem> {
    return this.http.get<TemplateItem>(`${this.apiUrl}/${id}`);
  }

  // Add a new item to a template
  addTemplateItem(item: TemplateItem): Observable<any> {
    return this.http.post(this.apiUrl, item);
  }

  // Update a template item
  updateTemplateItem(id: number, item: TemplateItem): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, item);
  }

  // Soft delete a template item
  deleteTemplateItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Batch add template items
   * @param items Array of TemplateItem objects (all for the same template)
   */
  addTemplateItemsBatch(items: TemplateItem[]): Observable<any> {
    const wrappedRequest = { items: items }; // Wrap the array
    return this.http.post(`${this.apiUrl}/batch`, wrappedRequest);
  }
}
