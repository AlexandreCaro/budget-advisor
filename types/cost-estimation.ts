type PriceTier = 'budget' | 'medium' | 'premium';

export interface CategoryEstimate {
  [key: string]: {
    [K in PriceTier]: {
      min: number;
      max: number;
      average: number;
      confidence: number;
      currency: string;
      source?: string;
    }
  }
} 