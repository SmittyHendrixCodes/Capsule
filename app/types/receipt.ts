export interface Receipt {
  id?: number | string;
  merchant: string;
  date: string;
  total: number;
  category: string;
  items: string | string[];
  description: string;
  module: string;
  imageUri?: string;
  cardLast4?: string;
  created_at?: string;
}

export type ModuleType = string;