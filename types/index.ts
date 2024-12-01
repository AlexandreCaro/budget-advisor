export interface ExpenseType {
  id: string;
  tripPlanId: string;
  name: string;
  key: string;
  preBooked: boolean;
  cost?: number;
  budgetType: string;
  budgetValue: number;
  defaultPercentage: number;
  isTracked: boolean;
}

export interface TripPlanType {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  country: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  currency: string;
  overallBudget: number;
  expenses: ExpenseType[];
}

export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>; 