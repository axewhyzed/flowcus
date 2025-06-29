import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { 
  TemplateList, 
  CreateTemplateRequest, 
  UpdateTemplateRequest 
} from '../models/template.model';
import { 
  TemplateItem, 
  CreateTemplateItemRequest, 
  BatchCreateTemplateItemsRequest 
} from '../models/template-item.model';

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  constructor(private apiService: ApiService) {}

  // Template List operations
  async getTemplatesByUser(userId: string): Promise<TemplateList[]> {
    return this.apiService.get<TemplateList[]>(`/templatelists?userId=${userId}`);
  }

  async getTemplateById(id: number): Promise<TemplateList> {
    return this.apiService.get<TemplateList>(`/templatelists/${id}`);
  }

  async createTemplate(template: CreateTemplateRequest): Promise<TemplateList> {
    return this.apiService.post<TemplateList>('/templatelists', template);
  }

  async updateTemplate(id: number, template: UpdateTemplateRequest): Promise<TemplateList> {
    return this.apiService.put<TemplateList>(`/templatelists/${id}`, template);
  }

  async deleteTemplate(id: number): Promise<void> {
    return this.apiService.delete<void>(`/templatelists/${id}`);
  }

  // Template Item operations
  async getTemplateItems(): Promise<TemplateItem[]> {
    return this.apiService.get<TemplateItem[]>('/templateitems');
  }

  async getTemplateItemById(id: number): Promise<TemplateItem> {
    return this.apiService.get<TemplateItem>(`/templateitems/${id}`);
  }

  async createTemplateItem(item: CreateTemplateItemRequest): Promise<TemplateItem> {
    return this.apiService.post<TemplateItem>('/templateitems', item);
  }

  async createTemplateItemsBatch(request: BatchCreateTemplateItemsRequest): Promise<TemplateItem[]> {
    return this.apiService.post<TemplateItem[]>('/templateitems/batch', request);
  }

  async updateTemplateItem(id: number, item: CreateTemplateItemRequest): Promise<TemplateItem> {
    return this.apiService.put<TemplateItem>(`/templateitems/${id}`, item);
  }

  async deleteTemplateItem(id: number): Promise<void> {
    return this.apiService.delete<void>(`/templateitems/${id}`);
  }
}
