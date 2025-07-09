export interface TemplateList {
  id: number;
  templateName: string;
  userId: number;
  createdAt: Date;
  isDeleted: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  userId: number;
}

export interface UpdateTemplateRequest extends CreateTemplateRequest {
  id: number;
}
