import { FormState } from '@/types/trip-planner';
import { cn } from '@/lib/utils';

export interface ValidationErrors {
  [key: string]: string;
}

export function validateStep(step: number, data: any): ValidationErrors {
  const errors: ValidationErrors = {};

  // Global validation - no nulls or undefined allowed anywhere
  if (!data) {
    errors.global = 'No data provided';
    return errors;
  }

  // Validate all required fields have actual values
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      errors[key] = `${key} cannot be empty`;
    }
  });

  switch (step) {
    case 1: // Name step
      if (!data.name?.trim() || data.name.length < 3 || data.name.length > 50) {
        errors.name = 'Trip name must be between 3 and 50 characters';
      }
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(data.name)) {
        errors.name = 'Trip name can only contain letters, numbers, spaces, hyphens and underscores';
      }
      break;

    case 2: // Destination step
      if (!data.country?.code || !data.country?.value) {
        errors.country = 'Valid country selection is required';
      }
      if (!data.city?.value || !data.city?.lat || !data.city?.lng) {
        errors.city = 'Valid city with coordinates is required';
      }
      if (!data.departureLocation?.city || !data.departureLocation?.lat || !data.departureLocation?.lng) {
        errors.departureLocation = 'Valid departure location with coordinates is required';
      }
      // Validate coordinates are within valid ranges
      if (data.city?.lat && (data.city.lat < -90 || data.city.lat > 90)) {
        errors.city = 'Invalid latitude';
      }
      if (data.city?.lng && (data.city.lng < -180 || data.city.lng > 180)) {
        errors.city = 'Invalid longitude';
      }
      break;

    case 3: // Dates step
      const now = new Date();
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      if (!(start instanceof Date) || isNaN(start.getTime())) {
        errors.startDate = 'Invalid start date';
      }
      if (!(end instanceof Date) || isNaN(end.getTime())) {
        errors.endDate = 'Invalid end date';
      }
      if (start < now) {
        errors.startDate = 'Start date cannot be in the past';
      }
      if (end <= start) {
        errors.endDate = 'End date must be after start date';
      }
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 1 || days > 365) {
        errors.endDate = 'Trip duration must be between 1 and 365 days';
      }
      break;

    case 4: // Travelers & Currency step
      const travelers = parseInt(data.travelers);
      if (!Number.isInteger(travelers) || travelers < 1 || travelers > 50) {
        errors.travelers = 'Number of travelers must be between 1 and 50';
      }
      if (!data.currency?.trim() || !/^[A-Z]{3}$/.test(data.currency)) {
        errors.currency = 'Valid 3-letter currency code is required';
      }
      break;

    case 5: // Budget step
      const budget = parseFloat(data.overallBudget);
      if (!budget || isNaN(budget) || budget <= 0 || budget > 1000000000) {
        errors.overallBudget = 'Budget must be between 1 and 1,000,000,000';
      }
      
      if (!Array.isArray(data.selectedCategories) || data.selectedCategories.length === 0) {
        errors.selectedCategories = 'At least one expense category is required';
      }
      
      if (!Array.isArray(data.expenses) || data.expenses.length === 0) {
        errors.expenses = 'Expense categories are required';
      } else {
        let totalAllocation = 0;
        data.expenses.forEach((expense: any, index: number) => {
          if (!expense.key || !expense.name) {
            errors[`expense_${index}`] = 'Invalid expense category';
          }
          const value = parseFloat(expense.budgetValue);
          if (!value || value <= 0) {
            errors[`expense_${index}`] = 'Budget allocation must be greater than 0';
          }
          if (!['budget', 'medium', 'premium'].includes(expense.selectedTier)) {
            errors[`expense_${index}_tier`] = 'Valid price tier (budget/medium/premium) must be selected';
          }
          totalAllocation += value || 0;
        });

        // Strict 100% allocation check with very small margin for floating point errors
        if (Math.abs(totalAllocation - 100) > 0.001) {
          errors.expenses = `Total allocation must be exactly 100% (currently ${totalAllocation.toFixed(3)}%)`;
        }
      }
      break;
  }

  return errors;
}

// Add this to your API route
export async function validateTripData(data: any) {
  const errors: ValidationErrors = {};

  // Basic data validation - no empty values allowed
  if (!data.name?.trim() || data.name.length < 3) {
    errors.name = 'Trip name must be at least 3 characters';
  }
  if (!data.country?.trim()) {
    errors.country = 'Country selection is required';
  }
  if (!data.city?.value) {
    errors.city = 'City selection is required';
  }
  if (!data.startDate || !data.endDate) {
    errors.dates = 'Both start and end dates are required';
  }
  
  const travelers = parseInt(data.travelers);
  if (!travelers || travelers < 1 || travelers > 50) {
    errors.travelers = 'Number of travelers must be between 1 and 50';
  }
  
  if (!data.currency?.trim()) {
    errors.currency = 'Currency selection is required';
  }
  
  const budget = parseFloat(data.overallBudget);
  if (!budget || budget <= 0) {
    errors.overallBudget = 'Budget must be greater than 0';
  }

  // Validate expense allocations
  if (data.expenses?.length) {
    let totalAllocation = 0;
    data.expenses.forEach((expense: any, index: number) => {
      const value = parseFloat(expense.budgetValue);
      if (!value || value <= 0) {
        errors[`expense_${index}`] = 'Each expense must have a budget greater than 0';
      }
      totalAllocation += value || 0;
    });

    if (Math.abs(totalAllocation - 100) > 0.01) {
      errors.expenses = `Total allocation must be exactly 100% (currently ${totalAllocation.toFixed(2)}%)`;
    }
  } else {
    errors.expenses = 'At least one expense category is required';
  }

  return errors;
}

export const getInputClassName = (error?: ValidationError | null) => {
  return error?.error ? "border-red-500" : "";
};

export const getBudgetInputClassName = (error?: ValidationError | null) => {
  return `pl-8 ${error?.error ? "border-red-500" : ""}`;
};

export const getCurrencyTriggerClassName = (error: ErrorState) => {
  return cn(
    "w-full",
    error?.error && "border-red-500"
  );
};

export const getDatePickerClassName = (error?: ValidationError | null, hasValue?: boolean) => {
  return cn(
    "w-full justify-start text-left font-normal",
    !hasValue && "text-muted-foreground",
    error?.error && "border-red-500"
  );
};

export const handleStepSave = async (
  step: number,
  formData: any,
  setErrors: (errors: any) => void
) => {
  try {
    // Validate the current step
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return { isValid: false };
    }

    // If we have a trip ID, update it
    if (formData.id) {
      const response = await fetch(`/api/trip-plans/${formData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...getStepData(step, formData),
          step
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      const updatedData = await response.json();
      return {
        isValid: true,
        updatedData
      };
    }

    // If no ID exists, create new trip plan
    const response = await fetch('/api/trip-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        userId: formData.userId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create trip plan');
    }

    const newTripPlan = await response.json();
    return {
      isValid: true,
      updatedData: {
        ...formData,
        id: newTripPlan.id
      }
    };
  } catch (error) {
    console.error('Error saving progress:', error);
    throw error;
  }
};

// Helper function to get relevant data for each step
const getStepData = (step: number, formData: any) => {
  switch (step) {
    case 1:
      return {
        name: formData.name
      };
    case 2:
      return {
        country: formData.country,
        city: formData.city,
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelers: formData.travelers,
        currency: formData.currency,
        overallBudget: formData.overallBudget
      };
    case 3:
      return {
        selectedCategories: formData.selectedCategories
      };
    case 4:
      return {
        expenses: formData.expenses
      };
    default:
      return {};
  }
}; 