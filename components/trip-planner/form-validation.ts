import { TripPlanData } from '@/types/trip-planner'
import { cn } from "@/lib/utils"

// Define field error states
export type FieldState = {
  error: boolean;
  message?: string;
  className?: string;
}

// Define form state type
export type FormValidationState = {
  name: FieldState;
  country: FieldState;
  dates: FieldState;
  travelers: FieldState;
  currency: FieldState;
  budget: FieldState;
  categories: FieldState;
  allocation: FieldState;
  [key: string]: FieldState;
}

// Base error styles that should be consistent across all fields
const errorStyles = 'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500';

// Base styles for inputs and selects
const baseInputStyles = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// Add new type for field updates
export type FieldUpdate = {
  field: string;
  value: any;
  currentErrors: Record<string, string>;
}

// Function to check if a field value is valid
function isFieldValid(field: string, value: any): boolean {
  switch (field) {
    case 'name':
      return !!value?.trim() && value.length >= 3 && value.length <= 50;
    case 'country':
      return !!value?.trim();
    case 'startDate':
    case 'endDate':
      return value instanceof Date && !isNaN(value);
    case 'travelers':
      return !!value && parseInt(value) >= 1;
    case 'currency':
      return !!value?.trim();
    case 'overallBudget':
      return !!value && parseFloat(value) > 0;
    default:
      return true;
  }
}

// Function to clear field error when value is valid
export function clearFieldError(update: FieldUpdate): Record<string, string> {
  const { field, value, currentErrors } = update;
  const newErrors = { ...currentErrors };

  // Special handling for dates
  if (field === 'startDate' || field === 'endDate') {
    if (isFieldValid(field, value)) {
      delete newErrors.dates;
    }
    return newErrors;
  }

  // Handle other fields
  if (isFieldValid(field, value)) {
    delete newErrors[field];
  }

  return newErrors;
}

// Update getFieldState to handle dynamic validation
export function getFieldState(error?: string, value?: any, field?: string): FieldState {
  if (!error) {
    // Check if the field has a valid value
    if (field && value && isFieldValid(field, value)) {
      return { error: false };
    }
    // Field is empty but no error yet
    return { error: false };
  }
  
  return {
    error: true,
    message: error,
    className: errorStyles
  };
}

// Get class names for standard input fields
export function getInputClassName(fieldState?: FieldState, baseClass: string = '') {
  return cn(
    baseInputStyles,
    baseClass,
    fieldState?.error && errorStyles
  )
}

// Get class names for select/combobox triggers
export function getSelectTriggerClassName(fieldState?: FieldState) {
  return cn(
    baseInputStyles,
    "flex items-center justify-between",
    fieldState?.error && errorStyles
  )
}

// Get class names for date picker buttons
export function getDatePickerClassName(fieldState?: FieldState, hasValue: boolean = true) {
  return cn(
    baseInputStyles,
    "w-full justify-start text-left font-normal",
    !hasValue && "text-muted-foreground",
    fieldState?.error && errorStyles
  )
}

// Get class names for category container
export function getCategoryContainerClassName(fieldState?: FieldState) {
  return cn(
    "space-y-4 rounded-md",
    fieldState?.error && 'p-4 border border-red-500'
  )
}

// Get class names for currency trigger
export function getCurrencyTriggerClassName(fieldState?: FieldState) {
  return cn(
    baseInputStyles,
    "flex items-center justify-between",
    fieldState?.error && errorStyles
  )
}

// Get class names for budget input
export function getBudgetInputClassName(fieldState?: FieldState) {
  return cn(
    baseInputStyles,
    "pl-8",
    fieldState?.error && errorStyles
  )
}

export async function validateStep(step: number, data: TripPlanData): Promise<{
  isValid: boolean;
  fields: FormValidationState;
}> {
  const errors: Record<string, string> = {};
  const fields: FormValidationState = {
    name: getFieldState(undefined, data.name, 'name'),
    country: getFieldState(undefined, data.country, 'country'),
    dates: getFieldState(undefined, data.startDate && data.endDate, 'dates'),
    travelers: getFieldState(undefined, data.travelers, 'travelers'),
    currency: getFieldState(undefined, data.currency, 'currency'),
    budget: getFieldState(undefined, data.overallBudget, 'budget'),
    categories: getFieldState(undefined, data.selectedCategories?.length > 0, 'categories'),
    allocation: { error: false }
  };

  switch (step) {
    case 1:
      if (!data.name?.trim()) {
        errors.name = "Trip name is required";
      } else if (data.name.length < 3) {
        errors.name = "Trip name must be at least 3 characters";
      } else if (data.name.length > 50) {
        errors.name = "Trip name must be less than 50 characters";
      }
      fields.name = getFieldState(errors.name);
      break;

    case 2:
      // Country validation
      if (!data.country?.trim()) {
        errors.country = "Country is required";
      }
      fields.country = getFieldState(errors.country);

      // Dates validation
      if (!data.startDate || !data.endDate) {
        errors.dates = "Both start and end dates are required";
      } else if (data.endDate < data.startDate) {
        errors.dates = "End date cannot be before start date";
      } else if (data.startDate < new Date()) {
        errors.dates = "Start date cannot be in the past";
      }
      fields.dates = getFieldState(errors.dates);

      // Travelers validation
      if (!data.travelers || parseInt(data.travelers) < 1) {
        errors.travelers = "Number of travelers is required";
      }
      fields.travelers = getFieldState(errors.travelers);

      // Currency validation
      if (!data.currency?.trim()) {
        errors.currency = "Currency is required";
      }
      fields.currency = getFieldState(errors.currency);

      // Budget validation
      if (!data.overallBudget || parseFloat(data.overallBudget) <= 0) {
        errors.budget = "Valid budget amount is required";
      }
      fields.budget = getFieldState(errors.budget);
      break;

    case 3:
      // Categories validation
      if (!data.selectedCategories?.length) {
        errors.categories = "At least one expense category must be selected";
      }
      fields.categories = getFieldState(errors.categories);
      break;

    case 4:
      // Budget allocation validation
      const totalPercentage = data.expenses
        .filter(expense => data.selectedCategories.includes(expense.key))
        .reduce((total, expense) => {
          if (expense.budgetType === 'percentage') {
            return total + (parseFloat(expense.budgetValue) || 0);
          }
          const budget = parseFloat(data.overallBudget ?? "0") || 1;
          return total + ((parseFloat(expense.budgetValue) || 0) / budget * 100);
        }, 0);

      if (Math.abs(totalPercentage - 100) > 0.1) {
        errors.allocation = `Total budget allocation must be 100% (currently ${totalPercentage.toFixed(1)}%)`;
      }
      fields.allocation = getFieldState(errors.allocation);

      // Validate pre-booked expenses
      data.expenses
        .filter(expense => expense.preBooked && data.selectedCategories.includes(expense.key))
        .forEach(expense => {
          if (!expense.cost || parseFloat(expense.cost) <= 0) {
            const errorKey = `expense_${expense.key}`;
            errors[errorKey] = `Pre-booked ${expense.name.toLowerCase()} cost is required`;
            fields[errorKey] = getFieldState(errors[errorKey]);
          }
        });
      break;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    fields
  };
}

export async function handleStepSave(
  step: number, 
  formData: any, 
  setErrors: (errors: any) => void
): Promise<{ isValid: boolean; updatedData?: any }> {
  try {
    // Validate current step
    const validation = await validateStep(step, formData);
    if (!validation.isValid) {
      setErrors(validation.errors || {});
      return { isValid: false };
    }

    // Check if we're editing or creating
    const isEditing = !!formData.id;
    
    if (step === 1) {
      if (isEditing) {
        // Update existing trip
        console.log('Updating existing trip:', formData.id);
        const updateResponse = await fetch(`/api/trip-plans/${formData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            status: formData.status
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update trip plan');
        }

        const updatedTrip = await updateResponse.json();
        console.log('Updated trip:', updatedTrip);
        
        return {
          isValid: true,
          updatedData: updatedTrip
        };
      } else {
        // Create new trip
        console.log('Creating new trip plan...');
        const createResponse = await fetch('/api/trip-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            status: 'DRAFT'
          })
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || 'Failed to create trip plan');
        }

        const newTrip = await createResponse.json();
        console.log('Created new trip:', newTrip);
        
        return {
          isValid: true,
          updatedData: newTrip
        };
      }
    }

    // For other steps, always update
    console.log(`Updating trip plan ${formData.id} for step ${step}`);
    const updateResponse = await fetch(`/api/trip-plans/${formData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.error || 'Failed to update trip plan');
    }

    const updatedTrip = await updateResponse.json();
    console.log(`Step ${step} - Update successful:`, updatedTrip);

    return {
      isValid: true,
      updatedData: updatedTrip
    };
  } catch (error) {
    console.error(`Failed to save step ${step}:`, error);
    throw error;
  }
} 