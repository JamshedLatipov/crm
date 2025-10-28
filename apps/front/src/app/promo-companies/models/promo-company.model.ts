export interface PromoCompany {
  id: number;
  name: string;
  description?: string;
  type: 'promoter' | 'affiliate' | 'partner';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget?: number;
  spent?: number;
  startDate?: string;
  endDate?: string;
  targetCriteria?: {
    industries?: string[];
    countries?: string[];
    leadSources?: string[];
    scoreMin?: number;
    scoreMax?: number;
  };
  leadsReached: number;
  leadsConverted: number;
  notes?: string;
  leads?: any[]; // Lead[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoCompanyRequest {
  name: string;
  description?: string;
  type?: 'promoter' | 'affiliate' | 'partner';
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget?: number;
  startDate?: string;
  endDate?: string;
  targetCriteria?: {
    industries?: string[];
    countries?: string[];
    leadSources?: string[];
    scoreMin?: number;
    scoreMax?: number;
  };
  notes?: string;
}

export interface UpdatePromoCompanyRequest {
  name?: string;
  description?: string;
  type?: 'promoter' | 'affiliate' | 'partner';
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget?: number;
  spent?: number;
  startDate?: string;
  endDate?: string;
  targetCriteria?: {
    industries?: string[];
    countries?: string[];
    leadSources?: string[];
    scoreMin?: number;
    scoreMax?: number;
  };
  leadsReached?: number;
  leadsConverted?: number;
  notes?: string;
}

export interface AddLeadsToPromoCompanyRequest {
  leadIds: number[];
}

export interface RemoveLeadsFromPromoCompanyRequest {
  leadIds: number[];
}