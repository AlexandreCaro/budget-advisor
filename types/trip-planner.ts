export type City = {
  code: string;
  name: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  isInbound?: boolean;
  isOutbound?: boolean;
  isMainCity?: boolean;
  orderIndex?: number;
};

export type FormState = {
  id?: string;
  name: string;
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED';
  country: string;
  city: City | null;
  cities: City[];
  startDate: Date;
  endDate: Date;
  travelers: string;
  currency: string;
  overallBudget: string;
  selectedCategories: string[];
  expenses: ExpenseData[];
  departureLocation?: {
    lat: number;
    lng: number;
    city?: string;
    airport?: string;
  } | null;
};

export interface ExpenseData {
  name: string;
  key: string;
  preBooked: boolean;
  cost: string;
  budgetType: 'percentage' | 'absolute';
  budgetValue: string;
  defaultPercentage: number;
  estimates: any;
  isManuallySet?: boolean;
}

export interface PerplexityOptions {
  onLLMResponse?: (category: string, response: Record<string, any>) => void;
}

export interface FormValidationState {
  [key: string]: {
    error: boolean;
    message?: string;
  };
}

export type UpdateExpenseFunction = (key: string, updates: Partial<ExpenseData>) => void;

export interface TierEstimate {
  min: number;
  max: number;
  average: number;
  confidence: number;
  source?: string;
}

export interface CategoryEstimate {
  budget: TierEstimate;
  medium: TierEstimate;
  premium: TierEstimate;
  currency: string;
}

export interface CategoryEstimates {
  [category: string]: CategoryEstimate;
}

export interface ExpenseCategory {
  key: string;
  name: string;
  budgetType: 'percentage' | 'absolute';
  budgetValue: string;
  defaultPercentage: number;
  preBooked: boolean;
  isTracked: boolean;
  selectedTier: 'budget' | 'medium' | 'premium';
  cost?: number | null;
} 