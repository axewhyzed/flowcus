export interface TemplateList {
  id: number;
  templateName: string;
  userId: string;
  createdAt: Date;
  isDeleted: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  userId: string;
}

export interface UpdateTemplateRequest extends CreateTemplateRequest {
  id: number;
}
