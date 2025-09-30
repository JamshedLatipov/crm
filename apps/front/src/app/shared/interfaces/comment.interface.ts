export enum CommentEntityType {
  DEAL = 'deal',
  LEAD = 'lead',
  CONTACT = 'contact',
  COMPANY = 'company'
}

export interface Comment {
  id: string;
  text: string;
  entityType: CommentEntityType;
  entityId: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface CreateCommentRequest {
  text: string;
  entityType: CommentEntityType;
  entityId: string;
}

export interface UpdateCommentRequest {
  text?: string;
}

export interface CommentFilters {
  entityType?: CommentEntityType;
  entityId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedComments {
  items: Comment[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}