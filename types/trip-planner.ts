export interface TripPlanData {
  id?: string;
  name: string;
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED';
  country: string;
  startDate: Date;
  endDate: Date;
  travelers: string;
  currency: string;
  overallBudget: string;
  selectedCategories: string[];
  expenses: Array<{
    id?: string;
    name: string;
    key: string;
    preBooked: boolean;
    cost: string | null;
    budgetType: 'percentage' | 'absolute';
    budgetValue: string;
    defaultPercentage: number;
    isTracked?: boolean;
    spent?: number;
  }>;
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

export interface ExpenseData {
  id?: string;
  name: string;
  key: string;
  preBooked: boolean;
  cost: string | null;
  budgetType: 'percentage' | 'absolute';
  budgetValue: string;
  defaultPercentage: number;
  isTracked?: boolean;
  spent?: number;
}

export interface UpdateExpenseFunction {
  (index: number, field: string, value: any): void;
}

export interface FormState {
  country: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  travelers: number;
  currency: string;
  overallBudget: number;
  expenses: ExpenseData[];
}

export type UpdateExpenseFunction = (key: string, updates: Partial<ExpenseData>) => void;

export type TripPlanData = {
  name?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  travelers?: string;
  currency?: string;
  overallBudget?: string;
  selectedCategories: string[];
  expenses: {
    key: string;
    name: string;
    budgetType: 'percentage' | string;
    budgetValue: string;
    preBooked?: boolean;
    cost?: string;
  }[];
}

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