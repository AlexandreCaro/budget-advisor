import { TripStatus } from '@prisma/client';

export interface TripExpenseCategory {
  id: string;
  tripPlanId: string;
  name: string;
  key: string;
  preBooked: boolean;
  cost: number | null;
  budgetType: string;
  budgetValue: number;
  defaultPercentage: number;
  selectedTier?: string;
  estimates?: any;
  spent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripPlan {
  id: string;
  userId: string;
  name: string;
  status: TripStatus;
  country: string | null;
  city: any | null;
  startDate: Date | null;
  endDate: Date | null;
  travelers: number | null;
  currency: string | null;
  overallBudget: number | null;
  expenses: TripExpenseCategory[];
  selectedCategories: string[];
  estimates: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export type City = {
  name: string;
  country: string;
  // other properties...
};