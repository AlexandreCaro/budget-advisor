"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { Checkbox } from '@/components/ui/checkbox'
import { currencies } from '@/lib/currencies'
import { format } from 'date-fns'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Label as ChartLabel } from 'recharts'
import { Progress } from "@/components/ui/progress"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { LocationCombobox } from './trip-planner/location-combobox'
import { CountryCode, Country, countries } from '@/lib/data/countries'
import { City, getCitiesForCountry } from '@/lib/data/cities'
import type { FormState, ExpenseData, UpdateExpenseFunction } from '@/types/trip-planner'
import { Icons } from "@/components/ui/icons"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { FormField } from '@/components/trip-planner/form-field'
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { validateStep, getInputClassName } from '@/components/trip-planner/form-validation'
import { BudgetAllocation } from '@/components/trip-planner/budget-allocation'
import { BudgetAllocationPreview } from '@/components/trip-planner/budget-allocation-preview'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity'
import { Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CityCombobox } from '@/components/trip-planner/city-combobox'
import { DepartureLocationField } from './trip-planner/departure-location-field'
import { CountryCombobox } from './trip-planner/country-combobox'
import { debounce } from 'lodash'
import { 
  Plane, 
  Building2, 
  Bus, 
  Utensils, 
  Ticket, 
  ShoppingBag, 
  Car 
} from "lucide-react";
import { X } from "lucide-react";
import { Plus } from "lucide-react";
import { MultiCitySelector } from '@/components/trip-planner/multi-city-selector';  // Add this import
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Add missing imports for types
interface PolarViewBox {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  clockWise: boolean;
}

type ExpenseCategory = {
  name: string;
  key: string;
  preBooked: boolean;
  cost: string;
  budgetType: 'percentage' | 'absolute';
  budgetValue: string;
  defaultPercentage: number;
  selectedTier: 'budget' | 'medium' | 'premium';
}

const STEPS = [
  "Name",
  "Destination",
  "Dates",
  "Travelers",
  "Budget",
  "Review",
] as const

const DEFAULT_CATEGORIES = ['accommodation', 'food']

type BudgetAlert = {
  show: boolean;
  message: string;
  totalPercentage: number;
  mode: 'initial' | 'manual' | 'none';
  action?: () => void;
}

// Add this type for tracking input state
type InputState = {
  isEditing: boolean;
  category: string;
}

// Add this validation function
const validatePercentageInput = (value: string): string => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return '0'
  return Math.min(100, Math.max(0, numValue)).toString()
}

// Add this helper function at the top level
const preventWheelChange = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur()
}

// Add this type for the summary data
type CategorySummary = {
  name: string
  key: string
  allocation: number
  allocatedAmount: number
  defaultPercentage: number
  estimatedAmount: number
  isPreBooked: boolean
  isTracked: boolean
  preBookedAmount?: number
}

// Add this function to save the trip plan
const saveTripPlan = async (tripData: any) => {
  try {
    // Prepare the data with city and departure location
    const saveData = {
      ...tripData,
      // Format city data if it exists
      city: tripData.city ? {
        value: tripData.city.value, // city code
        label: tripData.city.label  // city name
      } : undefined,
      // Format departure location if it exists
      departureLocation: tripData.departureLocation ? {
        lat: tripData.departureLocation.lat,
        lng: tripData.departureLocation.lng,
        city: tripData.departureLocation.city,
        airport: tripData.departureLocation.airport
      } : undefined
    };

    console.log('Saving trip plan with data:', saveData);

    const response = await fetch(`/api/trip-plans/${tripData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saveData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save trip plan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving trip plan:', error);
    throw error;
  }
};

type TripPlan = {
  id: string;
  name: string;
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED';
  country: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  currency: string;
  overallBudget: number;
  expenses: Array<{
    name: string;
    key: string;
    preBooked: boolean;
    cost: number | null;
    budgetType: 'percentage' | 'absolute';
    budgetValue: number;
    defaultPercentage: number;
  }>;
}

// Add to props
interface TripPlannerWizardProps {
  initialData?: {
    step?: number;  // Add this to allow forcing a specific step
    [key: string]: any;
  };
  onBack?: () => void;
}

type City = {
  code: string;
  name: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  isInbound?: boolean;  // Can arrive to this city
  isOutbound?: boolean; // Can depart from this city
};

type TripPlanData = {
  id?: string;
  name: string;
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED';
  country: CountryCode | '';
  city: City | null;      // Primary city
  cities: City[];         // Additional cities
  startDate: Date;
  endDate: Date;
  travelers: string;
  currency: string;
  overallBudget: string;
  selectedCategories: string[];
  expenses: Array<{
    name: string;
    key: string;
    preBooked: boolean;
    cost: string;
    budgetType: 'percentage' | 'absolute';
    budgetValue: string;
    defaultPercentage: number;
    estimates: any;
  }>;
  departureLocation?: {
    lat: number;
    lng: number;
    city?: string;
    airport?: string;
  } | null;
};


interface TripHeaderProps {
  step: number;
  formData: TripPlanData;
  initialData?: any;
  onBack?: () => void;
  router: any;
  isSaving?: boolean;
}

function TripHeader({ step, formData, initialData, onBack, router, isSaving }: TripHeaderProps) {
  const renderCityPath = () => {
    const routeCities = [];

    // 1. Add departure location if exists
    if (formData.departureLocation) {
      routeCities.push({
        label: formData.departureLocation.city || 'Departure',
        type: 'departure',
        id: 'departure'
      });
    }

    // 2. Add primary city (always both inbound and outbound)
    if (formData.city) {
      routeCities.push({
        ...formData.city,
        type: 'primary',
        id: 'primary'
      });
    }

    // 3. Add additional cities in order
    if (formData.cities?.length) {
      formData.cities.forEach((city, index) => {
        routeCities.push({
          ...city,
          type: 'additional',
          id: `additional-${index}`
        });
      });
    }

    // 4. Add return to departure city if it exists
    if (formData.departureLocation?.city) {
      routeCities.push({
        label: formData.departureLocation.city,
        type: 'return',
        id: 'return'
      });
    }

    return (
      <div className="flex items-center gap-1">
        {routeCities.map((city) => (
          <React.Fragment key={city.id}>
            {/* Departure plane - pointing up at 45° */}
            {city.type === 'departure' && (
              <Plane 
                className="h-3 w-3" 
                style={{ 
                  transform: 'rotate(-45deg)',  // Up and right for takeoff
                  marginRight: '2px'
                }}
              />
            )}
            
            <span className={cn(
              city.type === 'primary' && "font-medium",
              city.type === 'return' && "text-muted-foreground"
            )}>
              {city.label}
            </span>

            {/* Show arrow between cities */}
            {city.type !== 'return' && (
              <ArrowRight className="h-3 w-3" />
            )}

            {/* Landing plane - pointing down at 45° */}
            {city.type === 'return' && (
              <Plane 
                className="h-3 w-3" 
                style={{ 
                  transform: 'rotate(45deg)',  // Down and right for landing
                  marginLeft: '2px'
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b p-2">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">
          {formData.name || 'New Trip'}
        </h2>
        {step > 2 && formData.country && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {formData.country}
            {(formData.city || formData.departureLocation) && (
              <>
                <span className="mx-1">•</span>
                {renderCityPath()}
              </>
            )}
            {formData.startDate && formData.endDate && (
              <span className="ml-2">
                • {format(formData.startDate, "MMM d")} - {format(formData.endDate, "MMM d, yyyy")}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isSaving && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Saving changes...
          </div>
        )}
        {initialData && (
          <>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to Trips
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/trip-monitor')}>
              Open Monitor
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Add this helper function to safely convert to Date
const toDate = (value: Date | string | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

// Add these types at the top with other type definitions
interface City {
  code: string;
  value: string;
  label: string;
  name: string;  // Add this field
  lat: number;
  lng: number;
  country: string;
}

interface GeoPosition {
  lat: number;
  lng: number;
  city?: string;
  airport?: string;
}

// Add the useGeolocation hook
function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    setIsLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const newPosition: GeoPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      // Get nearest airport
      const airportData = await getNearestAirport(newPosition.lat, newPosition.lng);
      if (airportData) {
        newPosition.city = airportData.city;
        newPosition.airport = airportData.code;
      }

      setPosition(newPosition);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return { position, error, isLoading, detectLocation };
}

// Make sure the countries array is properly formatted
const countryOptions = countries.map(country => ({
  value: country.value,
  label: country.label
}));



// Add this type
type ManualAdjustmentDialogProps = {
  show: boolean;
  onClose: () => void;
  onSave: (expenses: ExpenseData[]) => void;
  expenses: ExpenseData[];
  selectedCategories: string[];
  overallBudget: number;
  currency: string;
};

// Create a separate ManualAdjustmentDialog component
const ManualAdjustmentDialog = ({
  show,
  onClose,
  onSave,
  expenses,
  selectedCategories,
  overallBudget,
  currency
}: ManualAdjustmentDialogProps) => {
  const [localExpenses, setLocalExpenses] = useState(expenses);
  const [totalAllocation, setTotalAllocation] = useState(
    expenses
      .filter(e => selectedCategories.includes(e.key))
      .reduce((sum, e) => sum + parseFloat(e.budgetValue.toString()), 0)
  );

  useEffect(() => {
    const newTotal = localExpenses
      .filter(e => selectedCategories.includes(e.key))
      .reduce((sum, e) => sum + parseFloat(e.budgetValue.toString()), 0);
    setTotalAllocation(newTotal);
  }, [localExpenses, selectedCategories]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-3xl w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manual Budget Adjustment</h2>
          <p className="text-lg font-semibold">
            Current total allocation: {totalAllocation.toFixed(1)}%
          </p>
        </div>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {localExpenses
            .filter(expense => selectedCategories.includes(expense.key))
            .map((expense, index) => {
              const absoluteValue = parseFloat(expense.budgetValue.toString()) * overallBudget / 100;
              const percentageValue = parseFloat(expense.budgetValue.toString());

              return (
                <div key={expense.key} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-base">{expense.name}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={percentageValue.toFixed(1)}
                      onChange={(e) => {
                        const newExpenses = [...localExpenses];
                        newExpenses[index].budgetValue = validatePercentageInput(e.target.value);
                        setLocalExpenses(newExpenses);
                      }}
                      className="w-24"
                    />
                    <span>%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{currency}</span>
                    <Input
                      type="number"
                      value={absoluteValue.toFixed(2)}
                      onChange={(e) => {
                        const newExpenses = [...localExpenses];
                        const newValue = parseFloat(e.target.value);
                        newExpenses[index].budgetValue = ((newValue / overallBudget) * 100).toString();
                        setLocalExpenses(newExpenses);
                      }}
                      className="w-32"
                    />
                  </div>
                </div>
              );
            })}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(localExpenses)}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

// Add this constant for category icons
const categoryIcons = {
  flight: Plane,
  accommodation: Building2,
  localTransportation: Bus,
  food: Utensils,
  activities: Ticket,
  shopping: ShoppingBag,
  carRental: Car
} as const;

// Add this constant for category colors (moved from budget-allocation-preview)
const categoryColors = {
  flight: "#F87171",
  accommodation: "#FB923C",
  localTransportation: "#FBBF24",
  food: "#A3E635",
  activities: "#4ADE80",
  shopping: "#2DD4BF",
  carRental: "#22D3EE",
} as const;

// Add these validation functions at the top level
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, { error: boolean; message?: string }>;
}

const validateStep1 = (data: TripPlanData): ValidationResult => {
  const errors: Record<string, { error: boolean; message?: string }> = {};
  
  if (!data.name?.trim()) {
    errors.name = {
      error: true,
      message: 'Please enter a trip name'
    };
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateStep2 = (data: TripPlanData): ValidationResult => {
  const errors: FormValidationState = {};

  // Validate departure location
  if (!data.departureLocation?.city) {
    errors.departureLocation = {
      error: true,
      message: "Please select your departure location"
    };
  }

  // Validate primary destination
  if (!data.city) {
    errors.city = {
      error: true,
      message: "Please select your main destination"
    };
  }

  // Validate additional cities
  if (data.cities?.length) {
    const allCities = data.cities;
    
    // Check if we have at least one intermediate stop
    const hasIntermediateStops = allCities.some(city => 
      city.isInbound || city.isOutbound
    );

    if (!hasIntermediateStops) {
      errors.cities = {
        error: true,
        message: "Please select at least one intermediate stop"
      };
    }

    // Check for duplicate cities
    const citySet = new Set();
    if (data.city) citySet.add(data.city.code);
    
    for (const city of allCities) {
      if (citySet.has(city.code)) {
        errors.cities = {
          error: true,
          message: "Each city can only be selected once"
        };
        break;
      }
      citySet.add(city.code);
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateStep3 = (data: TripPlanData): ValidationResult => {
  const errors: Record<string, { error: boolean; message?: string }> = {};
  
  if (!data.selectedCategories?.length) {
    errors.categories = {
      error: true,
      message: 'Please select at least one expense category'
    };
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

const validateStep4 = (data: TripPlanData): ValidationResult => {
  const errors: Record<string, { error: boolean; message?: string }> = {};
  
  // Validate overall budget
  const budget = Number(data.overallBudget);
  if (!budget || budget <= 0) {
    errors.budget = {
      error: true,
      message: 'Please enter a valid budget amount'
    };
  }

  // Validate budget allocations total to 100%
  const totalAllocation = data.expenses.reduce((sum, exp) => 
    sum + Number(exp.budgetValue), 0);
  
  if (Math.abs(totalAllocation - 100) > 0.1) { // Allow 0.1% tolerance
    errors.allocation = {
      error: true,
      message: 'Budget allocations must total 100%'
    };
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

// Update the validation function to accept formData
const validateCurrentStep = (step: number, data: TripPlanData): Record<string, { error: boolean; message?: string }> => {
  switch (step) {
    case 1:
      const result = validateStep1(data);
      return result.errors;
    case 2:
      const result2 = validateStep2(data);
      return result2.errors;
    case 3:
      const result3 = validateStep3(data);
      return result3.errors;
    case 4:
      const result4 = validateStep4(data);
      return result4.errors;
    default:
      return {};
  }
};

const TripPlannerWizard: React.FC<TripPlannerWizardProps> = ({ initialData, onBack }) => {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const budgetAllocationRef = useRef<any>(null);

  // Determine initial step based on data completeness
  const getInitialStep = (data: any) => {
    if (!data) return 1;
    
    // Check step 1 (name)
    if (!data.name) {
      return 1;
    }
    
    // Check step 2 (country, dates, travelers, currency, budget)
    if (!data.country || 
        !data.startDate || 
        !data.endDate || 
        !data.travelers ||
        !data.currency ||
        !data.overallBudget) {
      return 2;
    }
    
    // Check step 3 (categories)
    if (!data.selectedCategories?.length) {
      return 3;
    }
    
    // If all complete, go to step 4
    return 4;
  };

  const [step, setStep] = useState(getInitialStep(initialData));
  
  // Initialize form data with initial data or defaults
  const [formData, setFormData] = useState<TripPlanData>({
    id: initialData?.id || '',
    name: initialData?.name || '',
    country: initialData?.country || '',
    city: initialData?.city ? {
      ...initialData.city,
      isInbound: true,  // Primary city is always inbound
      isOutbound: true  // Primary city is always outbound
    } : null,
    cities: (initialData?.cities || []).map(city => ({
      ...city,
      isInbound: city.isInbound ?? false,  // Default to false for additional cities
      isOutbound: city.isOutbound ?? false  // Default to false for additional cities
    })),
    startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
    endDate: initialData?.endDate ? new Date(initialData.endDate) : new Date(),
    travelers: initialData?.travelers?.toString() || '1',
    currency: initialData?.currency || 'USD',
    overallBudget: initialData?.overallBudget?.toString() || '5000',
    selectedCategories: initialData?.selectedCategories || DEFAULT_EXPENSE_CATEGORIES.map(cat => cat.key),
    expenses: initialData?.expenses || DEFAULT_EXPENSE_CATEGORIES.map(category => ({
      name: category.name,
      key: category.key,
      preBooked: false,
      cost: '0',
      budgetType: 'percentage',
      budgetValue: category.defaultPercentage.toString(),
      defaultPercentage: category.defaultPercentage,
      estimates: null,
      selectedTier: 'medium',
      isTracked: true,
      spent: 0,
    })),
    status: initialData?.status || 'DRAFT',
    departureLocation: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, { error: boolean; message?: string }>>({});
  const [budgetAlert, setBudgetAlert] = useState<BudgetAlert>({
    show: false,
    message: '',
    totalPercentage: 100,
    mode: 'none'
  })
  const [showOverspendAlerts, setShowOverspendAlerts] = useState(true)
  const [globalTracking, setGlobalTracking] = useState(true)
  const [shownAlerts, setShownAlerts] = useState<Set<string>>(new Set())
  const [inputState, setInputState] = useState<InputState>({
    isEditing: false,
    category: ''
  })
  const [costEstimates, setCostEstimates] = useState<ReturnType<typeof estimateCosts> | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Add state for cost estimates
  const [estimates, setEstimates] = useState<{
    [category: string]: {
      budget: {
        min: number;
        max: number;
        average: number;
        confidence: number;
      };
      medium: {
        min: number;
        max: number;
        average: number;
        confidence: number;
      };
      premium: {
        min: number;
        max: number;
        average: number;
        confidence: number;
      };
    };
  } | null>(null);

  // Add state to track if estimates were already fetched
  const [estimatesFetched, setEstimatesFetched] = useState(false);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);

  

  

  useEffect(() => {
    // @ts-ignore
    window.testPerplexity = async () => {
      const testData = {
        country: 'United Kingdom',
        startDate: new Date('2024-12-07'),
        endDate: new Date('2024-12-14'),
        travelers: '2',
        currency: 'USD',
        selectedCategories: ['flight', 'food', 'accommodation', 'localTransportation', 'shopping'],
        expenses: [...DEFAULT_EXPENSE_CATEGORIES]
      };
      
      try {
        const results = await getPerplexityEstimates(testData);
        console.table(
          Object.entries(results).map(([category, estimate]) => {
            return {
              Category: category,
              Range: `$${estimate.budget.min} - $${estimate.budget.max}`,
              Average: `$${estimate.budget.average}`,
              Confidence: `${(estimate.budget.confidence * 100).toFixed(1)}%`,  // Added comma here
            };
          })
        );
      } catch (error) {
        console.error('Test failed:', error);
      }
    };
    
    console.log('Debug function ready: Run window.testPerplexity() to test');
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Add isEqual function for deep comparison
  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;
    if (a === null || b === null) return a === b;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => isEqual(a[key], b[key]));
  }

  // Add this state for tracking changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentStepData, setCurrentStepData] = useState<any>(null);

  // Add debounced save function
  

 

  // Update handleInputChange to only track changes without saving
  const handleInputChange = (field: string, value: any) => {
    console.log(`[TripPlannerWizard] Input change:`, { field, value });
    
    setFormData(prev => {
      const newData = { ...prev };
      
      // Check if the value is actually different
      if (isEqual(prev[field], value)) {
        console.log(`No change detected for field: ${field}`);
        return prev;
      }
      
      newData[field] = value;
      
      // Special handling for departureLocation
      if (field === 'departureLocation' && value) {
        console.log('[TripPlannerWizard] Updating departure location:', value);
        // Use the Airport type directly
        newData.departureLocation = value;
      }
      
      // Handle city updates with proper flight direction logic
      if (field === 'city' && value) {
        newData.city = {
          ...value,
          isInbound: true,  // Primary destination is always both inbound
          isOutbound: true  // and outbound by default
        };
      }
      
      // Handle additional cities
      if (field === 'cities' && Array.isArray(value)) {
        newData.cities = value.map(city => ({
          ...city,
          isInbound: Boolean(city.isInbound),
          isOutbound: Boolean(city.isOutbound)
        }));
      }
      
      // Mark that we have unsaved changes
      setHasUnsavedChanges(true);
      
      return newData;
    });
  };

  // Update handleNext to save changes before moving to next step
  const handleNext = async () => {
    console.log('Attempting to move to next step:', {
      currentStep: step,
      formData,
      hasUnsavedChanges
    });

    // Validate current step
    const stepErrors = validateCurrentStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      console.log('Validation errors:', stepErrors);
      setErrors(stepErrors);
      
      toast({
        title: "Validation Error",
        description: Object.values(stepErrors)[0].message || "Please fix the highlighted errors",
        variant: "destructive"
      });

      const form = document.querySelector('form');
      form?.classList.add('shake-animation');
      setTimeout(() => form?.classList.remove('shake-animation'), 500);

      const firstErrorField = document.querySelector('.invalid-input');
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      return;
    }

    // Save changes if there are any
    if (hasUnsavedChanges) {
      try {
        setIsSaving(true);
        const { isValid, updatedData } = await handleStepSave(step, formData, setErrors);
        
        if (!isValid) {
          console.log('Step validation failed');
          return;
        }

        // Update form data with saved data
        setFormData(prev => ({
          ...prev,
          ...updatedData
        }));

        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
        
        // Store current step data for comparison
        setCurrentStepData(updatedData);

        console.log('Step saved successfully');
      } catch (error) {
        console.error('Error saving step:', error);
        toast({
          title: "Error",
          description: "Failed to save changes. Please try again.",
          variant: "destructive"
        });
        return;
      } finally {
        setIsSaving(false);
      }
    }

    // Clear errors and move to next step
    setErrors({});
    setStep(prev => prev + 1);
  };

  // Update handleBack to handle unsaved changes
  const handleBack = async () => {
    if (step > 1) {
      // Save changes if there are any
      if (hasUnsavedChanges) {
        try {
          setIsSaving(true);
          const { updatedData } = await handleStepSave(step, formData, setErrors);
          
          // Update form data with saved data
          setFormData(prev => ({
            ...prev,
            ...updatedData
          }));
          
          // Reset unsaved changes flag
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Failed to save step:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Changes may not have been saved"
          });
        } finally {
          setIsSaving(false);
        }
      }
      
      // Move to previous step
      setStep(step - 1);
    }
  };

  // Add goToStep function for direct navigation
  const goToStep = async (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      try {
        // Save current step data before changing steps
        await handleStepSave(step);
        
        // Move to new step immediately
        setStep(stepIndex);
      } catch (error) {
        console.error('Failed to save step:', error);
        // Show error toast but don't prevent navigation
        toast({
          variant: "destructive",
          title: "Error",
          description: "Changes may not have been saved"
        });
        // Still change steps
        setStep(stepIndex);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const calculateAverageEstimate = (category: keyof ReturnType<typeof estimateCosts>) => {
    if (!costEstimates) return 0
    const estimate = costEstimates[category]
    return Math.round((estimate.min + estimate.max) / 2)
  }

  const calculateDefaultPercentage = (absoluteValue: number) => {
    const budget = parseFloat(formData.overallBudget)
    if (!budget || budget <= 0) return 0
    return Math.round((absoluteValue / budget) * 100)
  }

  const renderCostEstimate = (category: keyof ReturnType<typeof estimateCosts>) => {
    if (!costEstimates) return null
    const averageEstimate = calculateAverageEstimate(category)
    return averageEstimate > 0 ? (
      <div className="text-sm text-gray-500">
        Estimated cost: {formatCurrency(averageEstimate)}
      </div>
    ) : null
  }

  const calculateRemainingBudget = () => {
    const overallBudget = parseFloat(formData.overallBudget) || 0
    const allocatedBudget = formData.expenses
      .filter(expense => formData.selectedCategories.includes(expense.key))
      .reduce((total, expense: ExpenseData) => {
        if (expense.budgetType === 'absolute') {
          return total + (parseFloat(expense.budgetValue) || 0)
        }
        return total + (overallBudget * parseFloat(expense.budgetValue) / 100)
      }, 0)
    return overallBudget - allocatedBudget
  }

  const calculateTotalPercentage = () => {
    return formData.expenses
      .filter(expense => formData.selectedCategories.includes(expense.key))
      .reduce((total, expense) => {
        if (expense.budgetType === 'percentage') {
          return total + (parseFloat(expense.budgetValue) || 0)
        }
        return total + calculateDefaultPercentage(parseFloat(expense.budgetValue) || 0)
      }, 0)
  }

  const adjustPercentagesAutomatically = () => {
    const currentTotal = calculateTotalPercentage()
    if (Math.abs(currentTotal - 100) < 0.01) return

    const selectedExpenses = formData.expenses
      .filter(expense => 
        formData.selectedCategories.includes(expense.key) && 
        expense.budgetType === 'percentage'
      )

    // Calculate adjustment factor
    const adjustmentFactor = 100 / currentTotal

    // First pass: adjust all percentages
    let updatedExpenses = formData.expenses.map((expense: ExpenseData) => {
      if (formData.selectedCategories.includes(expense.key) && expense.budgetType === 'percentage') {
        const newPercentage = parseFloat((parseFloat(expense.budgetValue) * adjustmentFactor).toFixed(1))
        return {
          ...expense,
          budgetValue: newPercentage.toString()
        }
      }
      return expense
    })

    // Calculate new total after first adjustment
    const newTotal = updatedExpenses
      .filter(expense => formData.selectedCategories.includes(expense.key))
      .reduce((total, expense) => {
        if (expense.budgetType === 'percentage') {
          return total + parseFloat(expense.budgetValue)
        }
        return total + calculateDefaultPercentage(parseFloat(expense.budgetValue))
      }, 0)

    // If we're not exactly at 100%, adjust the largest percentage to make up the difference
    if (Math.abs(newTotal - 100) > 0.01) {
      const difference = 100 - newTotal
      const largestPercentageExpense = selectedExpenses
        .reduce((max, expense) => 
          parseFloat(expense.budgetValue) > parseFloat(max.budgetValue) ? expense : max,
          selectedExpenses[0]
        )

      updatedExpenses = updatedExpenses.map((expense: ExpenseData) => {
        if (expense.key === largestPercentageExpense.key) {
          const currentValue = parseFloat(expense.budgetValue)
          const adjustedValue = (currentValue + difference).toFixed(1)
          return {
            ...expense,
            budgetValue: adjustedValue
          }
        }
        return expense
      })
    }

    setFormData(prev => ({
      ...prev,
      expenses: updatedExpenses
    }))
    setBudgetAlert({ show: false, message: '', totalPercentage: 100, mode: 'none' })
  }

  const chartConfig = {
    value: {
      label: "Budget",
      color: "#000000",
    },
    flight: {
      label: "Flights",
      color: "#F87171",
    },
    accommodation: {
      label: "Accommodation",
      color: "#FB923C",
    },
    localTransportation: {
      label: "Local Transportation",
      color: "#FBBF24",
    },
    food: {
      label: "Food & Beverages",
      color: "#A3E635",
    },
    activities: {
      label: "Cultural Activities",
      color: "#4ADE80",
    },
    shopping: {
      label: "Shopping",
      color: "#2DD4BF",
    },
    carRental: {
      label: "Car Rental",
      color: "#22D3EE",
    },
    unallocated: {
      label: "Unallocated",
      color: "#E5E7EB",
    },
  } satisfies ChartConfig

  const getOverspentCategories = () => {
    const totalAllocated = calculateTotalPercentage();
    
    if (totalAllocated <= 100) return [];

    return formData.expenses
      .filter(expense => (
        formData.selectedCategories.includes(expense.key) &&
        !expense.preBooked &&
        (
          (expense.budgetType === 'percentage' && parseFloat(expense.budgetValue) > expense.defaultPercentage) ||
          (expense.budgetType === 'absolute' && parseFloat(expense.budgetValue) > (parseFloat(formData.overallBudget) * expense.defaultPercentage / 100))
        )
      ))
      .map(expense => ({
        name: expense.name,
        key: expense.key,
        current: expense.budgetType === 'percentage' 
          ? `${expense.budgetValue}%`
          : formatCurrency(parseFloat(expense.budgetValue)),
        defaultPercentage: `${expense.defaultPercentage}%`
      }));
  };

  const BudgetChart = () => {
    const allocatedData = formData.expenses
      .filter(expense => formData.selectedCategories.includes(expense.key))
      .map(expense => ({
        category: expense.key,
        name: expense.name,
        value: expense.budgetType === 'percentage' 
          ? parseFloat(expense.budgetValue) || 0
          : calculateDefaultPercentage(parseFloat(expense.budgetValue) || 0)
      }))

    const totalAllocated = allocatedData.reduce((sum, item) => sum + item.value, 0)
    const unallocatedPercentage = Math.max(0, 100 - totalAllocated)

    const data = unallocatedPercentage > 0 
      ? [...allocatedData, { category: 'unallocated', name: 'Unallocated', value: unallocatedPercentage }]
      : allocatedData

    const totalBudget = formatCurrency(parseFloat(formData.overallBudget))

    return (
      <Card className="mt-6">
        <CardHeader className="pb-0">
          <CardTitle>Budget Allocation</CardTitle>
          <CardDescription>
            {totalAllocated > 100 
              ? `Budget overspent by ${(totalAllocated - 100).toFixed(1)}%` 
              : totalAllocated === 100 
                ? "Budget is fully allocated"
                : `${totalAllocated.toFixed(1)}% of budget allocated`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={80}
                  outerRadius={150}
                  fill="#8884d8"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={chartConfig[entry.category as keyof typeof chartConfig].color}
                    />
                  ))}
                  <ChartLabel
                    content={({ viewBox }) => {
                      if (!viewBox) return null;
                      const { innerRadius, outerRadius, cx, cy } = viewBox as PolarViewBox;
                      return (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={cx}
                            y={cy - 15}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {totalBudget}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 15}
                            className="fill-muted-foreground text-sm"
                          >
                            Total Budget
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value}: {entry.payload.value.toFixed(1)}%
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSave = async () => {
    if (!session?.user) {
      signIn('google')
      return
    }

    try {
      const savedPlan = await saveTripPlan(formData)
      router.push(`/trip-plans/${savedPlan.id}`)
    } catch (error) {
      // Handle error (show toast notification, etc.)
      console.error('Failed to save trip plan:', error)
    }
  }
  

  const createInitialPlan = async (name: string) => {
    try {
      const response = await fetch('/api/trip-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) throw new Error('Failed to create trip plan')
      
      const plan = await response.json()
      setFormData(prev => ({ ...prev, id: plan.id }))
      return plan
    } catch (error) {
      console.error('Error creating initial plan:', error)
      throw error
    }
  }
  
  
  

  // Update the numberOfDays calculation
  const numberOfDays = useMemo(() => {
    const startDate = toDate(formData.startDate);
    const endDate = toDate(formData.endDate);
    
    if (!startDate || !endDate) return 1;
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [formData.startDate, formData.endDate]);

  // Update handleDurationChange to use the helper
  const handleDurationChange = (newNumberOfDays: number) => {
    const startDate = toDate(formData.startDate);
    if (!startDate) return;
    
    const newEndDate = new Date(startDate);
    newEndDate.setDate(startDate.getDate() + newNumberOfDays - 1);
    
    setFormData(prev => ({
      ...prev,
      endDate: newEndDate
    }));
  };

  const handleBudgetAdjustment = (newBudget: number) => {
    setFormData(prev => ({
      ...prev,
      overallBudget: newBudget.toString(),
      expenses: prev.expenses.map(expense => ({
        ...expense,
        // Preserve the percentage allocations
        budgetValue: expense.budgetValue
      }))
    }));
  };

  const calculateDays = (startDate: Date, endDate: Date): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Add state for cities
  const [cities, setCities] = useState<City[]>([]);
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Add function to fetch cities
  const fetchCities = async (country: string) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`/api/cities?country=${encodeURIComponent(country)}`);
      if (!response.ok) throw new Error('Failed to fetch cities');
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast({
        title: "Error",
        description: "Failed to load cities",
        variant: "destructive"
      });
    } finally {
      setLoadingCities(false);
    }
  };

  

  // Add this handler function
  const handleCitySearch = (value: string) => {
    console.log('=== City Search Process ===');
    console.log('Search query:', value);
    console.log('Current country:', formData.country);
    
    if (!formData.country) {
      console.log('No country selected, skipping search');
      setCityResults([]);
      return;
    }
    
    try {
      const filtered = cities.filter(city => {
        console.log('Filtering city:', city);
        return city.country === formData.country &&
          (city.label.toLowerCase().includes(value.toLowerCase()) ||
           city.code.toLowerCase().includes(value.toLowerCase()));
      });

      console.log('Filtered cities:', {
        total: filtered.length,
        cities: filtered
      });
      
      setCityResults(filtered);
    } catch (error) {
      console.error('Error in handleCitySearch:', error);
      setCityResults([]);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <CardHeader>
              <CardTitle>Name Your Trip</CardTitle>
              <CardDescription>
                Give your trip a memorable name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField
                  id="name"
                  label="Trip Name"
                  value={formData.name}
                  onChange={(value) => handleInputChange('name', value)}
                  error={errors.name}
                  required
                  className={getInputClassName(errors.name)}
                />
              </div>
            </CardContent>
          </>
        );

      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
              <CardDescription>Set your trip details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Departure Location */}
                <DepartureLocationField
                  value={formData.departureLocation}
                  onChange={handleDepartureLocationChange}
                  error={errors.departureLocation}
                />

                {/* Country and City Selection */}
                <div className="space-y-4">
                  {/* Country and Primary City in same row */}
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <div className="flex items-center gap-2">
                      {/* Country Selection */}
                      <div className="w-1/3">
                        <CountryCombobox
                          value={formData.country}
                          onChange={handleCountryChange}
                          error={errors.country}
                        />
                      </div>

                      {/* Primary City with Flight Direction */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1">
                          <CityCombobox
                            countryCode={formData.country || ''}
                            value={formData.city}
                            onChange={(city) => handleInputChange('city', city)}
                            excludeCities={(formData.cities || []).map(c => c.code)}
                            disabled={!formData.country}
                          />
                        </div>
                        {/* Flight Direction Buttons */}
                        {formData.city && (  // Change city to formData.city
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleInputChange('city', {
                                  ...formData.city!,  // Use formData.city
                                  isInbound: !formData.city?.isInbound
                                });
                              }}
                              title="Arrival Flight"
                              className={cn(
                                "shrink-0",
                                formData.city.isInbound && "border-2 border-primary"
                              )}
                            >
                              <Plane 
                                className="h-4 w-4" 
                                style={{ 
                                  transform: 'rotate(45deg)'  // Down and right for landing
                                }}
                              />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleInputChange('city', {
                                  ...formData.city!,  // Use formData.city
                                  isOutbound: !formData.city?.isOutbound
                                });
                              }}
                              title="Departure Flight"
                              className={cn(
                                "shrink-0",
                                formData.city.isOutbound && "border-2 border-primary"
                              )}
                            >
                              <Plane 
                                className="h-4 w-4" 
                                style={{ 
                                  transform: 'rotate(-45deg)'  // Up and right for takeoff
                                }}
                              />
                            </Button>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newCities = [...(formData.cities || []), {} as City];
                            handleInputChange('cities', newCities);
                          }}
                          title="Add another city"
                          className="shrink-0 h-10 w-10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Additional Cities */}
                  {formData.cities?.length > 0 && (
                    <div className="space-y-2">
                      <Label>Additional Cities</Label>
                      <div className="space-y-2">
                        {formData.cities.map((city, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex-1">
                              <CityCombobox
                                countryCode={formData.country || ''}
                                value={city}
                                onChange={(newCity) => {
                                  if (newCity && (
                                    formData.city?.code === newCity.code || 
                                    formData.cities.some((c, i) => i !== index && c.code === newCity.code)
                                  )) {
                                    toast({
                                      title: "City already selected",
                                      description: "Please choose a different city",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  const newCities = [...formData.cities];
                                  newCities[index] = newCity;
                                  handleInputChange('cities', newCities.filter(Boolean));
                                }}
                                excludeCities={[
                                  formData.city?.code,
                                  ...formData.cities
                                    .filter((_, i) => i !== index)
                                    .map(c => c.code)
                                ].filter(Boolean)}
                              />
                            </div>
                            {city && (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newCities = [...formData.cities];
                                    newCities[index] = {
                                      ...city,
                                      isInbound: !city.isInbound
                                    };
                                    handleInputChange('cities', newCities);
                                  }}
                                  title="Arrival Flight"
                                  className={cn(
                                    "shrink-0",
                                    city.isInbound && "border-2 border-primary"
                                  )}
                                >
                                  <Plane 
                                    className="h-4 w-4" 
                                    style={{ 
                                      transform: 'rotate(45deg)'  // Down and right for landing
                                    }}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newCities = [...formData.cities];
                                    newCities[index] = {
                                      ...city,
                                      isOutbound: !city.isOutbound
                                    };
                                    handleInputChange('cities', newCities);
                                  }}
                                  title="Departure Flight"
                                  className={cn(
                                    "shrink-0",
                                    city.isOutbound && "border-2 border-primary"
                                  )}
                                >
                                  <Plane 
                                    className="h-4 w-4" 
                                    style={{ 
                                      transform: 'rotate(-45deg)'  // Up and right for takeoff
                                    }}
                                  />
                                </Button>
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newCities = formData.cities.filter((_, i) => i !== index);
                                handleInputChange('cities', newCities);
                              }}
                              className="shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground",
                            errors.startDate && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(formData.startDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => {
                            handleInputChange('startDate', date);
                            saveProgress({ startDate: date });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground",
                            errors.endDate && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? (
                            format(formData.endDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => {
                            handleInputChange('endDate', date);
                            saveProgress({ endDate: date });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Travelers Input */}
                <div className="space-y-2">
                  <Label htmlFor="travelers">Number of Travelers</Label>
                  <Input
                    id="travelers"
                    type="number"
                    min="1"
                    value={formData.travelers}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('travelers', value);
                    }}
                    className={cn(errors.travelers && "border-red-500")}
                  />
                  {errors.travelers && (
                    <p className="text-sm text-red-500">{errors.travelers.message}</p>
                  )}
                </div>

                {/* Budget Input */}
                <div className="space-y-2">
                  <Label>Overall Budget</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={formData.overallBudget}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange('overallBudget', value);
                      }}
                      className={cn(errors.overallBudget && "border-red-500")}
                    />
                    <Select 
                      value={formData.currency} 
                      onValueChange={(value) => {
                        handleInputChange('currency', value);
                      }}
                    >
                      <SelectTrigger className={cn("w-[150px]", errors.currency && "border-red-500")}>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.overallBudget && (
                    <p className="text-sm text-red-500">{errors.overallBudget.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </>
        );

      case 3:
        console.log('=== Step 3 Debug ===', {
          selectedCategories: formData.selectedCategories,
          defaultCategories: DEFAULT_EXPENSE_CATEGORIES,
          expenses: formData.expenses
        });

        return (
          <>
            <CardHeader>
              <CardTitle>Select Expense Categories</CardTitle>
              <CardDescription>
                Select at least one expense category for your trip
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_EXPENSE_CATEGORIES.map((category) => {
                console.log('Rendering category:', {
                  key: category.key,
                  isSelected: formData.selectedCategories.includes(category.key)
                });
                
                const IconComponent = categoryIcons[category.key as keyof typeof categoryIcons];
                const color = categoryColors[category.key as keyof typeof categoryColors];
                
                return (
                  <Card 
                    key={category.key}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      formData.selectedCategories.includes(category.key) && "border-primary"
                    )}
                    onClick={() => {
                      console.log('Category clicked:', category.key);
                      const newCategories = formData.selectedCategories.includes(category.key)
                        ? formData.selectedCategories.filter(c => c !== category.key)
                        : [...formData.selectedCategories, category.key];
                      console.log('New categories:', newCategories);
                      handleCategorySelection(newCategories);
                    }}
                  >
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: color }}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                        <Checkbox
                          checked={formData.selectedCategories.includes(category.key)}
                          onCheckedChange={() => {
                            const newCategories = formData.selectedCategories.includes(category.key)
                              ? formData.selectedCategories.filter(c => c !== category.key)
                              : [...formData.selectedCategories, category.key];
                            handleCategorySelection(newCategories);
                          }}
                        />
                      </div>
                      <CardDescription>
                        <div className="flex items-center justify-between">
                          <span>Typical allocation: {category.defaultPercentage}% of budget</span>
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </CardContent>
          </>
        );

      case 4:
        console.log('=== Step 4 Debug ===', {
          selectedCategories: formData.selectedCategories,
          expenses: formData.expenses,
          overallBudget: formData.overallBudget
        });
        
        // Ensure expenses is always an array and preserve existing expenses
        const safeExpenses = Array.isArray(formData.expenses) ? [...formData.expenses] : [];
        
        return (
          <BudgetAllocationPreview
            ref={budgetAllocationRef}
            selectedCategories={formData.selectedCategories}
            expenses={safeExpenses as unknown as ExpenseData[]}
            currency={formData.currency}
            overallBudget={Number(formData.overallBudget)}
            country={formData.country || ''}
            startDate={formData.startDate ? new Date(formData.startDate) : null}
            endDate={formData.endDate ? new Date(formData.endDate) : null}
            travelers={Number(formData.travelers) || 1}
            cities={cities}
            departureLocation={formData.departureLocation || undefined}
            onExpenseUpdate={handleExpenseUpdate}
            estimates={estimates}
            onEstimatesUpdate={handleEstimatesUpdate}
            onAdjustBudget={handleBudgetAdjustment}
            onCategoriesChange={handleCategorySelection}
            onNext={handleNext}
            onAdjustDuration={handleDurationChange}
            numberOfDays={numberOfDays}
            tripId={formData.id || ''}
            isEditing={!!initialData}
          />
        );
      
      case 5:
        return (
          <>
            <CardHeader>
              <CardTitle>Review Your Trip Plan</CardTitle>
              <CardDescription>Review and confirm your trip details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Trip Name</TableCell>
                      <TableCell>{formData.name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Destination</TableCell>
                      <TableCell>
                        {formData.country} - {formData.city?.label}
                        {formData.cities?.length > 0 && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Additional cities: {formData.cities.map(c => c.label).join(', ')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Dates</TableCell>
                      <TableCell>
                        {format(formData.startDate, "PPP")} - {format(formData.endDate, "PPP")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Budget</TableCell>
                      <TableCell>
                        {formatCurrency(Number(formData.overallBudget), formData.currency)}
                        <div className="text-sm text-muted-foreground mt-1">
                          For {formData.travelers} traveler{Number(formData.travelers) > 1 ? 's' : ''}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Categories</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {formData.selectedCategories.map(category => (
                            <Badge key={category} variant="secondary">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create Trip'
                )}
              </Button>
            </CardFooter>
          </>
        );
      default:
        return null
    }
  }

  // Add saving indicator in the header
  const renderSavingIndicator = () => {
    if (isSaving || pendingSave) {
      return (
        <div className="flex items-center text-sm text-muted-foreground">
          <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
          Saving changes...
        </div>
      );
    }
    return null;
  };

  // At the top with other state declarations
  const [open, setOpen] = useState(false);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("")

  // Move saveProgress inside the component to access formData
  const saveProgress = async (updates: Partial<TripPlanData>) => {
    try {
      if (!formData.id) {
        console.error('No trip ID available for saving progress');
        return;
      }

      // Only save if there are actual changes
      const changedFields = Object.entries(updates).reduce((acc, [key, value]) => {
        if (!currentStepData || !isEqual(currentStepData[key], value)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // If no changes, skip save
      if (Object.keys(changedFields).length === 0) {
        console.log('No changes detected, skipping save');
        return currentStepData;
      }

      console.log('Saving changed fields:', changedFields);

      const { startDate, endDate, expenses, ...rest } = changedFields;
      
      // Convert dates to ISO strings if they are Date objects
      const startDateString = startDate instanceof Date ? startDate.toISOString() : startDate;
      const endDateString = endDate instanceof Date ? endDate.toISOString() : endDate;

      // Prepare expenses with estimates
      const preparedExpenses = expenses?.map(expense => ({
        ...expense,
        estimateStructure: estimates?.[expense.key] || null,
        budgetValue: typeof expense.budgetValue === 'number' ? expense.budgetValue : parseFloat(expense.budgetValue || '0'),
        cost: typeof expense.cost === 'number' ? expense.cost : parseFloat(expense.cost || '0')
      }));

      // Consolidate all updates into a single request
      const response = await fetch(`/api/trip-plans/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rest,
          startDate: startDateString,
          endDate: endDateString,
          expenses: preparedExpenses,
          estimates
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      const result = await response.json();
      
      // Update current step data
      setCurrentStepData(result);
      
      return result;
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  };

  // Update handleStepSave to include validation
  const handleStepSave = async (
    step: number, 
    data: TripPlanData, 
    setErrors: React.Dispatch<React.SetStateAction<Record<string, { error: boolean; message?: string }>>>
  ) => {
    try {
      console.log('Starting handleStepSave:', { step, data });
      
      let tripId = data.id;
      
      if (!tripId) {
        // Create new trip with minimal data
        const createPayload = { 
          name: data.name.trim()
        };
        console.log('Creating new trip with payload:', createPayload);

        const createResponse = await fetch('/api/trip-plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createPayload),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Create trip error:', errorData);
          throw new Error(errorData.details || 'Failed to create trip');
        }

        const newTrip = await createResponse.json();
        console.log('New trip created:', newTrip);
        tripId = newTrip.id;
        
        setFormData(prev => ({
          ...prev,
          id: tripId
        }));
      }

      // Get the data for the current step
      const stepData = getStepData(step, data);
      console.log('Saving step data:', stepData);

      // Save the step data
      const savedData = await saveProgress(stepData);

      return {
        isValid: true,
        updatedData: savedData
      };
    } catch (error) {
      console.error('Error in handleStepSave:', error);
      throw error;
    }
  };

  const debouncedSaveProgress = useMemo(
    () =>
      debounce(async (updates: Partial<TripPlanData>) => {
        try {
          // Skip save if no updates provided
          if (!updates || Object.keys(updates).length === 0) {
            console.log('No updates to save');
            return;
          }

          setIsSaving(true);
          console.log('Saving updates:', updates);

          const result = await saveProgress(updates);
          
          // Update current step data with saved result
          setCurrentStepData(prev => ({
            ...prev,
            ...result
          }));

          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Error in debouncedSaveProgress:', error);
          toast({
            title: "Error",
            description: "Failed to save changes",
            variant: "destructive"
          });
        } finally {
          setIsSaving(false);
        }
      }, 1000),
    [saveProgress, toast]
  );

  // Update the loadEstimates function to prevent unnecessary fetches
  const loadEstimates = useCallback(async () => {
    if (!formData.id || !formData.selectedCategories?.length || isLoadingEstimates) {
      return;
    }

    try {
      setIsLoadingEstimates(true);
      console.log('Fetching estimates for trip:', formData.id);

      // First try to load existing estimates from the database
      const savedResponse = await fetch(`/api/estimates?tripId=${formData.id}`);
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        if (savedData.estimates && Object.keys(savedData.estimates).length > 0) {
          console.log('Found saved estimates:', savedData.estimates);
          setEstimates(savedData.estimates);
          setEstimatesFetched(true);
          setIsLoadingEstimates(false);
          return;
        }
      }

      // If no saved estimates, fetch new ones from Perplexity
      const response = await fetch('/api/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: formData.id,
          country: formData.country,
          startDate: formData.startDate,
          endDate: formData.endDate,
          travelers: formData.travelers,
          currency: formData.currency,
          selectedCategories: formData.selectedCategories,
          expenses: formData.expenses,
          overallBudget: parseFloat(formData.overallBudget),
          departureLocation: formData.departureLocation
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch estimates');
      }

      const results = await response.json();
      console.log('Received new estimates:', results);
      
      setEstimates(results);
      setEstimatesFetched(true);

    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cost estimates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingEstimates(false);
    }
  }, [formData.id, formData.selectedCategories, formData.country, formData.startDate, 
      formData.endDate, formData.travelers, formData.currency, formData.expenses, 
      formData.overallBudget, formData.departureLocation, isLoadingEstimates, toast]);

  // Update the useEffect that triggers estimates loading
  useEffect(() => {
    if (step === 4 && !estimatesFetched && formData.selectedCategories?.length > 0 && !isLoadingEstimates) {
      console.log('Entering step 4, loading estimates:', {
        tripId: formData.id,
        selectedCategories: formData.selectedCategories,
        estimatesFetched
      });
      loadEstimates();
    }
  }, [step, estimatesFetched, formData.selectedCategories, loadEstimates, isLoadingEstimates]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSaveProgress.cancel();
    };
  }, [debouncedSaveProgress]);

  // Update handleCountryChange to use debounced save
  const handleCountryChange = useCallback((countryCode: string) => {
    console.log('=== Country Selection Process ===');
    console.log('Selected country code:', countryCode);
    
    // Update form data
    handleInputChange('country', countryCode);
    handleInputChange('city', null);
    
    // Get cities for the selected country
    const citiesList = getCitiesForCountry(countryCode).map(city => ({
      ...city,
      name: city.label  // Add name field using the label value
    }));
    setCities(citiesList);

    // Use debounced save
    debouncedSaveProgress({
      country: countryCode,
      city: null
    });
  }, [handleInputChange, debouncedSaveProgress]);

  // Update getStepData to properly handle each step's data
  const getStepData = (step: number, data: TripPlanData) => {
    switch (step) {
      case 1:
        return {
          name: data.name
        };
      case 2:
        return {
          country: data.country,
          city: data.city,
          startDate: data.startDate,
          endDate: data.endDate,
          travelers: data.travelers,
          currency: data.currency,
          overallBudget: data.overallBudget,
          selectedCategories: data.selectedCategories,
          expenses: data.expenses,
          departureLocation: data.departureLocation
        };
      case 3:
        return {
          selectedCategories: data.selectedCategories,
          expenses: data.expenses
        };
      case 4:
        return {
          expenses: data.expenses,
          selectedCategories: data.selectedCategories,
          overallBudget: data.overallBudget
        };
      default:
        return {};
    }
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      
      // Fixed URL structure
      const response = await fetch(`/api/trip-plans/${formData.id}/verify-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          expenses: formData.expenses?.map(expense => ({
            ...expense,
            budgetValue: parseFloat(expense.budgetValue.toString())
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete trip plan');
      }

      const result = await response.json();
      router.push('/dashboard');
      return result;
    } catch (error) {
      console.error('Error completing trip plan:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete trip plan"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOwnership = async () => {
    try {
      // Fixed URL structure
      const response = await fetch(`/api/trip-plans/${formData.id}/verify-owner`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify ownership');
      }
      
      return data.authorized;
    } catch (error) {
      console.error('Error verifying ownership:', error);
      return false;
    }
  };

  // For budget updates
  const updateBudget = async (budgetData: any) => {
    try {
      // Fixed URL structure
      const response = await fetch('/api/trip-plans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: formData.id,
          ...budgetData
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update budget');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  };

  // Update effect to properly load and format city data
  useEffect(() => {
    if (step === 2 && formData.id) {
      console.log('=== Loading Step 2 Data ===');
      
      const loadTripData = async () => {
        try {
          const response = await fetch(`/api/trip-plans/${formData.id}`);
          if (!response.ok) {
            throw new Error('Failed to load trip data');
          }
          
          const tripData = await response.json();
          console.log('Loaded trip data:', tripData);

          // Update form data with DB values, properly formatting city data
          setFormData(prev => {
            // Format primary city with flight directions
            const primaryCity = tripData.city ? {
              code: tripData.city.code,
              value: tripData.city.code,
              label: tripData.city.label || tripData.city.name,
              name: tripData.city.name,
              country: tripData.city.country,
              lat: tripData.city.lat || 0,
              lng: tripData.city.lng || 0,
              isInbound: tripData.city.isInbound ?? true,  // Primary city defaults to both
              isOutbound: tripData.city.isOutbound ?? true // inbound and outbound
            } : null;

            // Format additional cities with flight directions
            const additionalCities = Array.isArray(tripData.cities) 
              ? tripData.cities.map((city: any) => ({
                  code: city.code,
                  value: city.code,
                  label: city.label || city.name,
                  name: city.name,
                  country: city.country,
                  lat: city.lat || 0,
                  lng: city.lng || 0,
                  isInbound: city.isInbound ?? false,  // Additional cities default to false
                  isOutbound: city.isOutbound ?? false // for both directions
                }))
              : [];

            const updatedData = {
              ...prev,
              country: tripData.country || '',
              city: primaryCity,
              cities: additionalCities,
              departureLocation: tripData.departureLocation,
              startDate: tripData.startDate ? new Date(tripData.startDate) : prev.startDate,
              endDate: tripData.endDate ? new Date(tripData.endDate) : prev.endDate,
              travelers: tripData.travelers?.toString() || prev.travelers,
              currency: tripData.currency || prev.currency
            };

            console.log('Updated form data:', updatedData);
            return updatedData;
          });

          // If there's a country, load its cities
          if (tripData.country) {
            console.log('Loading cities for country:', tripData.country);
            const citiesList = getCitiesForCountry(tripData.country).map(city => ({
              ...city,
              name: city.label  // Add name field using the label value
            }));
            console.log('Loaded cities:', citiesList);
            setCities(citiesList);
          }

        } catch (error) {
          console.error('Error loading trip data:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load trip data"
          });
        }
      };

      loadTripData();
    }
  }, [step, formData.id, toast]);

  // Add this function before the return statement in TripPlannerWizard
  const handleCategoriesChange = (newCategories: string[]) => {
    handleCategorySelection(newCategories);
    debouncedSaveProgress({ 
      selectedCategories: newCategories 
    });
  };

  // 1. Create a stable expenses state
  const [stableExpenses, setStableExpenses] = useState<ExpenseData[]>([]);

  // 2. Separate the initialization logic
  const initializeExpenses = (selectedCategories: string[]) => {
    return DEFAULT_EXPENSE_CATEGORIES.map(category => ({
      id: '', // Will be set by the server
      tripPlanId: '', // Will be set by the server
      name: category.name,
      key: category.key,
      preBooked: false,
      cost: null,
      budgetType: 'percentage' as const,
      budgetValue: category.defaultPercentage,
      defaultPercentage: category.defaultPercentage,
      selectedTier: 'medium' as const,
      estimates: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isManuallySet: false
    }));
  };

  // 3. Handle step 4 initialization
  useEffect(() => {
    if (step === 4 && formData.selectedCategories.length > 0) {
      console.log('Step 4: Initializing expenses', {
        selectedCategories: formData.selectedCategories,
        currentExpenses: formData.expenses,
        stableExpenses
      });
      
      // Check if we already have expenses for these categories
      const hasAllExpenses = formData.selectedCategories.every(cat => 
        formData.expenses.some(exp => exp.key === cat)
      );

      if (!hasAllExpenses) {
        // Initialize only missing categories
        const existingExpenses = new Set(formData.expenses.map(e => e.key));
        const missingCategories = formData.selectedCategories.filter(cat => !existingExpenses.has(cat));
        
        const newExpenses = [
          ...formData.expenses,
          ...initializeExpenses(missingCategories)
        ];

        console.log('Updating expenses with:', newExpenses);

        setStableExpenses(newExpenses);
        setFormData(prev => ({
          ...prev,
          expenses: newExpenses
        }));
      } else {
        // Use existing expenses
        setStableExpenses(formData.expenses);
      }
    }
  }, [step, formData.selectedCategories, initializeExpenses]);

  // 4. Handle estimates update separately
  useEffect(() => {
    if (step === 4 && estimates && stableExpenses.length > 0) {
      console.log('Updating expenses with estimates');
      const updatedExpenses = stableExpenses.map(expense => {
        if (estimates[expense.key]) {
          return {
            ...expense,
            estimates: estimates[expense.key]
          };
        }
        return expense;
      });
      setStableExpenses(updatedExpenses);
    }
  }, [estimates]);

  // 5. Add a useEffect to persist expenses when they change
  useEffect(() => {
    if (formData.id && formData.expenses.length > 0) {
      console.log('Persisting expenses:', formData.expenses);
      saveProgress({ expenses: formData.expenses }).catch(console.error);
    }
  }, [formData.expenses, formData.id]);

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name?.trim()) {
          errors.name = 'Please enter a trip name';
        }
        break;
      // ... other cases
    }

    return errors;
  };

  // Add state for selected cities
  const [selectedCities, setSelectedCities] = useState<City[]>([]);

  // Add this effect to initialize selected cities when loading existing data
  useEffect(() => {
    if (formData.city || formData.cities?.length) {
      const allCities = [
        formData.city,
        ...(formData.cities || [])
      ].filter(Boolean) as City[];
      
      setSelectedCities(allCities);
    }
  }, [formData.city, formData.cities]);

  // First, add city state
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  // Add shake animation styles using useEffect
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .shake-animation {
        animation: shake 0.5s;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      .invalid-input {
        border-color: red;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add this effect to load expense categories when returning to step 3
  useEffect(() => {
    if (step === 3 && formData.id) {
      console.log('=== Loading Step 3 Data ===');
      
      const loadTripData = async () => {
        try {
          const response = await fetch(`/api/trip-plans/${formData.id}`);
          if (!response.ok) {
            throw new Error('Failed to load trip data');
          }
          
          const tripData = await response.json();
          console.log('Loading expense categories:', tripData.selectedCategories);

          setFormData(prev => ({
            ...prev,
            selectedCategories: tripData.selectedCategories?.length > 0 
              ? tripData.selectedCategories 
              : prev.selectedCategories,
            expenses: tripData.expenses?.map((expense: any) => ({
              ...expense,
              budgetValue: expense.budgetValue.toString(),
              cost: expense.cost?.toString() || '0'
            })) || []
          }));

        } catch (error) {
          console.error('Error loading trip data:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load expense categories"
          });
        }
      };

      loadTripData();
    }
  }, [step, formData.id]);

  // Add this near the top of your component with other state declarations
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});

  // Add this function to handle single category refresh
  const handleSingleCategoryRefresh = async (categoryKey: string) => {
    if (loadingCategories[categoryKey] || !formData.id) return;

    setLoadingCategories(prev => ({ ...prev, [categoryKey]: true }));
    
    try {
      const response = await fetch('/api/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: formData.id,
          country: formData.country,
          startDate: formData.startDate,
          endDate: formData.endDate,
          travelers: formData.travelers,
          currency: formData.currency,
          selectedCategories: [categoryKey],
          departureLocation: formData.departureLocation
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh estimates');
      }

      const newEstimates = await response.json();
      
      // Update estimates in form data
      setFormData(prev => ({
        ...prev,
        expenses: prev.expenses.map(expense => {
          if (expense.key === categoryKey) {
            return {
              ...expense,
              estimates: newEstimates[categoryKey]
            };
          }
          return expense;
        })
      }));

      toast({
        title: "Success",
        description: `Updated estimates for ${categoryKey}`,
      });
    } catch (error) {
      console.error('Error refreshing estimates:', error);
      toast({
        title: "Error",
        description: "Failed to refresh estimates",
        variant: "destructive"
      });
    } finally {
      setLoadingCategories(prev => ({ ...prev, [categoryKey]: false }));
    }
  };

  // Add this near the top of the file with other state declarations
  const [persistedCategories, setPersistedCategories] = useState<string[]>([]);

  // Add this effect to persist categories
  useEffect(() => {
    if (formData.selectedCategories?.length > 0) {
      setPersistedCategories(formData.selectedCategories);
      // Also save to localStorage for extra persistence
      localStorage.setItem('tripPlannerCategories', JSON.stringify(formData.selectedCategories));
    }
  }, [formData.selectedCategories]);

  // Add this effect to restore categories from localStorage on mount
  useEffect(() => {
    const savedCategories = localStorage.getItem('tripPlannerCategories');
    if (savedCategories) {
      const parsedCategories = JSON.parse(savedCategories);
      if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
        setFormData(prev => ({
          ...prev,
          selectedCategories: parsedCategories
        }));
      }
    }
  }, []);

  const handleDepartureLocationChange = (location: any) => {
    if (!location) {
      handleInputChange('departureLocation', null);
      return;
    }

    // Ensure consistent format for departure location
    const formattedLocation = {
      lat: location.lat,
      lng: location.lng,
      city: location.city || location.name,
      airport: location.airport || location.code,
      name: location.city || location.name,
      code: location.airport || location.code
    };

    handleInputChange('departureLocation', formattedLocation);
  };

  const handleCategorySelection = useCallback((newCategories: string[]) => {
    console.log('Handling category selection:', {
      newCategories,
      currentExpenses: formData.expenses
    });
    
    // Keep existing expenses for selected categories and add new ones
    const updatedExpenses = newCategories.map(categoryKey => {
      const existingExpense = formData.expenses.find(e => e.key === categoryKey);
      if (existingExpense) return existingExpense;
      
      const defaultCategory = DEFAULT_EXPENSE_CATEGORIES.find(c => c.key === categoryKey);
      if (!defaultCategory) return null;
      
      return {
        key: categoryKey,
        name: defaultCategory.name,
        budgetType: 'percentage' as const,
        budgetValue: defaultCategory.defaultPercentage.toString(),
        selectedTier: 'medium' as const,
        preBooked: false,
        cost: '0',
        defaultPercentage: defaultCategory.defaultPercentage,
        estimates: null
      };
    }).filter(Boolean) as ExpenseData[];

    // Check if there are actual changes before updating
    const categoriesChanged = !isEqual(new Set(formData.selectedCategories), new Set(newCategories));
    const expensesChanged = !isEqual(formData.expenses, updatedExpenses);

    if (categoriesChanged || expensesChanged) {
      console.log('Categories or expenses changed, updating state');
      setFormData(prev => ({
        ...prev,
        selectedCategories: newCategories,
        expenses: updatedExpenses
      }));

      // Save changes
      debouncedSaveProgress({
        selectedCategories: newCategories,
        expenses: updatedExpenses
      });
    } else {
      console.log('No changes detected in categories or expenses');
    }
  }, [formData.selectedCategories, formData.expenses, debouncedSaveProgress]);

  // Update the handleExpenseUpdate function to prevent recursive updates
  const handleExpenseUpdate = useCallback((expenses: ExpenseData[]) => {
    console.log('Updating expenses:', expenses);
    
    setFormData(prev => {
      // Check if there are actual changes
      const hasChanges = expenses.some((expense, index) => {
        const prevExpense = prev.expenses[index];
        return !prevExpense || 
          prevExpense.budgetValue !== expense.budgetValue ||
          prevExpense.selectedTier !== expense.selectedTier;
      });

      if (!hasChanges) return prev;

      return {
        ...prev,
        expenses: expenses.map(expense => ({
          ...expense,
          budgetValue: parseFloat(expense.budgetValue?.toString() || '0'),
          cost: parseFloat(expense.cost?.toString() || '0')
        }))
      };
    });

    // Only save if we have a trip ID
    if (formData.id) {
      debouncedSaveProgress({
        expenses: expenses.map(expense => ({
          ...expense,
          budgetValue: parseFloat(expense.budgetValue?.toString() || '0'),
          cost: parseFloat(expense.cost?.toString() || '0')
        }))
      });
    }
  }, [formData.id, debouncedSaveProgress]);

  // Update the handleEstimatesUpdate function to prevent recursive updates
  const handleEstimatesUpdate = useCallback((newEstimates: Record<string, any>) => {
    console.log('Updating estimates:', newEstimates);
    setEstimates(newEstimates);
    
    // Only update expenses if they don't already have estimates
    setFormData(prev => {
      const needsUpdate = prev.expenses.some(expense => !expense.estimates);
      if (!needsUpdate) return prev;

      return {
        ...prev,
        expenses: prev.expenses.map(expense => ({
          ...expense,
          estimates: newEstimates[expense.key] || null
        }))
      };
    });
  }, []);

  return (
    <Card className="flex flex-col h-[calc(100vh-2rem)] shadow-sm mx-0 max-w-none rounded-lg">
      <TripHeader 
        step={step} 
        formData={formData} 
        initialData={initialData} 
        onBack={onBack} 
        router={router}
        isSaving={isSaving}
      />

      <div className="flex-1 overflow-y-auto">
        {renderStep()}
      </div>

      <CardFooter className="shrink-0 flex justify-between border-t px-6 py-4">
        <div className="flex w-full justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button 
            onClick={handleNext}
            disabled={isSubmitting || (step === 5 && (isSaving || pendingSave))}
          >
            {step === 5 ? (
              isSaving || pendingSave ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                'Complete'
              )
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default TripPlannerWizard;

