export interface ExpenseData {
  key: string;
  name: string;
  budgetType: string;
  budgetValue: number;
  defaultPercentage: number;
  preBooked: boolean;
  cost?: number;
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