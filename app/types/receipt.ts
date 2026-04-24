export interface Receipt {
  id?: number;
  merchant: string;
  date: string;
  total: number;
  category: string;
  items: string;
  description: string;
  module: 'work' | 'tax' | 'personal' | 'general';
  imageUri?: string;
  cardLast4?: string;
  created_at?: string;
}

export type ModuleType = 'work' | 'tax' | 'personal' | 'general';