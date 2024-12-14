interface City {
  code: string;
  name: string;
  country: string;
  label?: string;
}

interface FormState {
  id?: string;
  name: string;
  country: string;
  city: City | null;
  cities: City[];
  overallBudget: string;
  expenses: Expense[];
  // ... other fields
} 