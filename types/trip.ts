export interface TripExpenseCategory {
  id?: string;
  name: string;
  key: string;
  preBooked: boolean;
  cost: number | null;
  budgetType: 'percentage' | 'fixed';
  budgetValue: number;
  defaultPercentage: number;
  spent: number;
  isTracked: boolean;
  estimatedCost?: number;
  minEstimate?: number;
  maxEstimate?: number;
  confidence?: number;
  dailySpending?: {
    [date: string]: number;
  };
  transactions?: Array<{
    id: string;
    amount: number;
    date: string;
    description: string;
  }>;
}

export interface TripPlan {
  id: string;
  name: string;
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED';
  country: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  currency: string;
  overallBudget: number;
  selectedCategories: string[];
  expenses: TripExpenseCategory[];
} 