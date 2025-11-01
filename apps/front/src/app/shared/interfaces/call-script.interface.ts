export interface CallScriptCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallScript {
  id: string;
  title: string;
  description?: string;
  category: CallScriptCategory;
  categoryId: string;
  parent?: CallScript;
  parentId?: string;
  children?: CallScript[];
  steps?: string[];
  questions?: string[];
  tips?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallScriptRequest {
  title: string;
  description?: string;
  categoryId?: string;
  parentId?: string;
  steps?: string[];
  questions?: string[];
  tips?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCallScriptRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  parentId?: string;
  steps?: string[];
  questions?: string[];
  tips?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface CallScriptFilters {
  categoryId?: string;
  active?: boolean;
  tree?: boolean;
  page?: number;
  limit?: number;
}

export interface CallScriptTree extends CallScript {
  children: CallScript[];
}