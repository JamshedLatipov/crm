import { CallScriptTree } from '../../shared/interfaces/call-script.interface';

export interface SoftphoneScript {
  id: string;
  title: string;
  description?: string;
  steps?: string[];
  questions?: string[];
  tips?: string[];
  category?: string; // Flattened category name
  bookmarked?: boolean;
  recentlyUsed?: boolean;
  children?: SoftphoneScript[];
}

export function mapCallScriptToSoftphoneScript(s: any): SoftphoneScript {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    steps: s.steps,
    questions: s.questions,
    tips: s.tips,
    category: s.category?.name || (typeof s.category === 'string' ? s.category : null),
    bookmarked: false,
    recentlyUsed: false,
    children: (s.children || []).map((c: any) => mapCallScriptToSoftphoneScript(c)),
  };
}
