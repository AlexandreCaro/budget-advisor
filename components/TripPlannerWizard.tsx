"use client"

import React, { useState, useMemo, useEffect } from 'react'
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
import { estimateCosts } from '@/lib/costEstimation'
import { format } from 'date-fns'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Label as ChartLabel } from 'recharts'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Combobox } from "@/components/ui/combobox"
import { countries } from '@/lib/countries'
import type { FormState, ExpenseData, UpdateExpenseFunction } from '@/types/trip-planner'
import { Icons } from "@/components/ui/icons"
import { ArrowLeft } from "lucide-react"
import { FormField } from '@/components/trip-planner/form-field'
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { validateStep, getInputClassName, getSelectTriggerClassName, getDatePickerClassName, getCategoryContainerClassName, getCurrencyTriggerClassName, getBudgetInputClassName, type FieldState, clearFieldError } from '@/components/trip-planner/form-validation'
import { BudgetAllocation } from '@/components/trip-planner/budget-allocation';
import { getPerplexityEstimates, getFlightEstimates } from '@/lib/cost-estimation/perplexity';
import { BudgetAllocationPreview } from '@/components/trip-planner/budget-allocation-preview';
import { handleStepSave } from '@/components/trip-planner/form-validation'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity';

type ExpenseCategory = {
  name: string;
  key: string;
  preBooked: boolean;
  cost: string;
  budgetType: 'percentage' | 'absolute';
  budgetValue: string;
  defaultPercentage: number;
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
const saveTripPlan = async (tripData: any, userId: string) => {
  try {
    const response = await fetch('/api/trip-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        country: tripData.country,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        travelers: parseInt(tripData.travelers),
        currency: tripData.currency,
        overallBudget: parseFloat(tripData.overallBudget),
        expenses: tripData.expenses.map((expense: any) => ({
          name: expense.name,
          key: expense.key,
          preBooked: expense.preBooked,
          cost: expense.preBooked ? parseFloat(expense.cost) : null,
          budgetType: expense.budgetType,
          budgetValue: parseFloat(expense.budgetValue),
          defaultPercentage: expense.defaultPercentage,
          isTracked: true,
        })),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save trip plan')
    }

    return await response.json()
  } catch (error) {
    console.error('Error saving trip plan:', error)
    throw error
  }
}

// Add this type definition
type PolarViewBox = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}

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

type TripPlanData = {
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
    name: string;
    key: string;
    preBooked: boolean;
    cost: string;
    budgetType: 'percentage' | 'absolute';
    budgetValue: string;
    defaultPercentage: number;
  }>;
}

function TripHeader({ 
  step, 
  formData, 
  initialData, 
  onBack, 
  router 
}: { 
  step: number, 
  formData: TripPlanData,
  initialData?: any,
  onBack?: () => void,
  router: any
}) {
  return (
    <div className="flex items-center justify-between border-b p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">
          {formData.name || 'New Trip'}
        </h2>
        {step > 2 && formData.country && (
          <div className="text-sm text-muted-foreground">
            {formData.country}
            {formData.startDate && formData.endDate && (
              <span className="ml-2">
                • {format(formData.startDate, "MMM d")} - {format(formData.endDate, "MMM d, yyyy")}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {initialData && (
          <>
            <Button variant="outline" onClick={onBack}>
              Back to Trips
            </Button>
            <Button variant="outline" onClick={() => router.push('/trip-monitor')}>
              Open Monitor
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function TripPlannerWizard({ initialData, onBack }: TripPlannerWizardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // Determine initial step based on data completeness
  const getInitialStep = (data: any) => {
    if (!data) return 1;
    
    // Check step 2 completion (country, dates, budget)
    if (!data.country || !data.startDate || !data.endDate || !data.overallBudget) {
      return 2;
    }
    
    // Check step 3 completion (categories)
    if (!data.selectedCategories?.length) {
      return 3;
    }
    
    // If all complete, go to step 4
    return 4;
  };

  const [step, setStep] = useState(getInitialStep(initialData));
  
  // Initialize form data with initial data or defaults
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    country: initialData?.country || '',
    startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
    endDate: initialData?.endDate ? new Date(initialData.endDate) : new Date(),
    travelers: initialData?.travelers?.toString() || '1',
    currency: initialData?.currency || 'USD',
    overallBudget: initialData?.overallBudget?.toString() || '',
    selectedCategories: initialData?.selectedCategories || DEFAULT_CATEGORIES,
    expenses: initialData?.expenses || DEFAULT_EXPENSE_CATEGORIES.map(expense => ({
      ...expense,
      budgetValue: DEFAULT_CATEGORIES.includes(expense.key) ? expense.defaultPercentage.toString() : '0',
    })),
    status: initialData?.status || 'DRAFT'
  })

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

  // Move Perplexity call to step 4
  useEffect(() => {
    const fetchEstimates = async () => {
      if (step !== 4) return;
      
      if (!formData.country || !formData.startDate || !formData.endDate || !formData.currency || !formData.travelers) {
        console.log('Missing required data for estimates');
        return;
      }

      try {
        const response = await fetch('/api/perplexity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: formData.country,
            startDate: formData.startDate,
            endDate: formData.endDate,
            travelers: formData.travelers,
            currency: formData.currency,
            selectedCategories: formData.selectedCategories
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch estimates');
        }

        const results = await response.json();
        setEstimates(results);
      } catch (error) {
        console.error('Error fetching estimates:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch cost estimates"
        });
      }
    };

    fetchEstimates();
  }, [step, formData.country, formData.startDate, formData.endDate, formData.currency, formData.travelers]);

  useEffect(() => {
    // @ts-ignore
    window.testPerplexity = async () => {
      const testData = {
        country: 'United Kingdom',
        startDate: new Date('2024-12-07'),
        endDate: new Date('2024-12-14'),
        travelers: '2',
        currency: 'USD',
        selectedCategories: ['flight', 'food', 'accommodation', 'localTransportation', 'shopping']
      };
      
      try {
        const results = await getPerplexityEstimates(testData);
        console.table(Object.entries(results).map(([category, estimate]) => ({
          Category: category,
          Range: `$${estimate.min} - $${estimate.max}`,
          Average: `$${estimate.average}`,
          Confidence: `${(estimate.confidence * 100).toFixed(1)}%`
        })));
      } catch (error) {
        console.error('Test failed:', error);
      }
    };
    
    console.log('Debug function ready: Run window.testPerplexity() to test');
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategorySelection = (categories: string[]) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      selectedCategories: categories
    }));
  };

  const handleExpenseUpdate = (key: string, updates: Partial<TripExpenseCategory>) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense => {
        if (expense.key === key) {
          return {
            ...expense,
            ...updates
          };
        }
        return expense;
      })
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      if (!session?.user?.id) {
        console.log('No user session, redirecting to sign in...')
        signIn('google')
        return
      }

      console.log('Starting to save trip plan...', {
        userId: session.user.id,
        formData
      })

      const response = await fetch('/api/trip-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'include'
        },
        body: JSON.stringify({
          userId: session.user.id,
          country: formData.country,
          startDate: formData.startDate,
          endDate: formData.endDate,
          travelers: parseInt(formData.travelers),
          currency: formData.currency,
          overallBudget: parseFloat(formData.overallBudget),
          expenses: formData.expenses
            .filter((expense: ExpenseData) => formData.selectedCategories.includes(expense.key))
            .map((expense: ExpenseData) => ({
              name: expense.name,
              key: expense.key,
              preBooked: expense.preBooked,
              cost: expense.preBooked ? parseFloat(expense.cost) : null,
              budgetType: expense.budgetType,
              budgetValue: parseFloat(expense.budgetValue),
              defaultPercentage: expense.defaultPercentage,
              isTracked: true,
            })),
        }),
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save trip plan')
      }

      const savedPlan = await response.json()
      console.log('Trip plan saved successfully:', savedPlan)

      router.push('/trip-monitor')
    } catch (error) {
      console.error('Error saving trip plan:', error)
      if (error instanceof Error && error.message === 'Unauthorized') {
        signIn('google')
      } else {
        setError(error instanceof Error ? error.message : 'Failed to save trip plan')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate current step
      const validation = await validateStep(step, formData);
      if (!validation.isValid) {
        setErrors(validation.errors || {});
        setIsSubmitting(false);
        return;
      }

      // Clear errors if validation passed
      setErrors({});

      // Start background save if needed
      if (hasChanges) {
        setIsSaving(true);
        setPendingSave(true);
        
        // Start save in background
        handleStepSave(step, formData, setErrors)
          .then((result) => {
            if (result.updatedData) {
              setFormData(result.updatedData);
            }
            setHasChanges(false);
            setPendingSave(false);
            setIsSaving(false);
          })
          .catch((error) => {
            console.error('Save error:', error);
            toast({
              title: "Warning",
              description: "Changes are being saved in the background",
              variant: "default"
            });
            setPendingSave(false);
            setIsSaving(false);
          });
      }

      // Move to next step immediately
      setStep(prev => prev + 1);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error in handleNext:', error);
      setIsSubmitting(false);
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setShownAlerts(new Set())
    setStep(prev => Math.max(1, prev - 1))
  }

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
      .reduce((total, expense) => {
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
    let updatedExpenses = formData.expenses.map(expense => {
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
          parseFloat(expense.budgetValue) > parseFloat(max.budgetValue) ? expense : max
        )

      updatedExpenses = updatedExpenses.map(expense => {
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
    const totalAllocated = calculateTotalPercentage()
    
    if (totalAllocated <= 100) return []

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
        default: `${expense.defaultPercentage}%`,
      }))
  }

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

  const BudgetAlertDialog = () => (
    <AlertDialog 
      open={budgetAlert.mode === 'initial'}
      onOpenChange={(open) => {
        if (!open) {
          setBudgetAlert(prev => ({ ...prev, mode: 'none' }))
        }
      }}
    >
      <AlertDialogContent className="border-red-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Budget Allocation Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="text-red-600/90">
            {budgetAlert.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="sm:w-auto w-full">
            Continue Editing
          </AlertDialogCancel>
          <Button
            onClick={() => setBudgetAlert(prev => ({ ...prev, mode: 'manual' }))}
            variant="outline"
            className="sm:w-auto w-full border-red-200 hover:bg-red-50"
          >
            Adjust Manually
          </Button>
          <AlertDialogAction 
            onClick={adjustPercentagesAutomatically}
            className="sm:w-auto w-full bg-red-600 hover:bg-red-700"
          >
            Adjust Automatically
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const ManualAdjustmentDialog = () => {
    const [localExpenses, setLocalExpenses] = useState(formData.expenses)
    const [totalAllocation, setTotalAllocation] = useState(budgetAlert.totalPercentage)
    const overallBudget = parseFloat(formData.overallBudget) || 1

    useEffect(() => {
      const newTotal = localExpenses
        .filter(expense => 
          formData.selectedCategories.includes(expense.key) &&
          !expense.preBooked
        )
        .reduce((total, expense) => {
          if (expense.budgetType === 'percentage') {
            return total + (parseFloat(expense.budgetValue) || 0)
          }
          // Convert absolute values to percentage for total calculation
          const absoluteValue = parseFloat(expense.budgetValue) || 0
          return total + (absoluteValue / overallBudget * 100)
        }, 0)
      
      setTotalAllocation(newTotal)
    }, [localExpenses, overallBudget])

    const handleValueChange = (index: number, value: string, type: 'percentage' | 'absolute') => {
      setLocalExpenses(prev => {
        const newExpenses = [...prev]
        const expense = newExpenses[index]
        
        if (type === 'absolute') {
          const absoluteValue = parseFloat(value) || 0
          expense.budgetValue = absoluteValue.toString()
          expense.budgetType = 'absolute'
        } else {
          const percentageValue = validatePercentageInput(value)
          expense.budgetValue = percentageValue
          expense.budgetType = 'percentage'
        }
        
        return newExpenses
      })
    }

    return (
      <AlertDialog open={budgetAlert.mode === 'manual'}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Budget Adjustment</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-semibold">
              Current total allocation: {totalAllocation.toFixed(1)}%
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {localExpenses
              .filter(expense => 
                formData.selectedCategories.includes(expense.key) && 
                !expense.preBooked
              )
              .map((expense: ExpenseData, index) => {
                const absoluteValue = expense.budgetType === 'absolute' 
                  ? parseFloat(expense.budgetValue) || 0
                  : ((parseFloat(expense.budgetValue) || 0) * overallBudget / 100)

                const percentageValue = expense.budgetType === 'percentage'
                  ? parseFloat(expense.budgetValue) || 0
                  : ((parseFloat(expense.budgetValue) || 0) / overallBudget * 100)

                return (
                  <div key={expense.key} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="text-base">{expense.name}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={percentageValue.toFixed(1)}
                        onWheel={preventWheelChange}
                        onChange={(e) => handleValueChange(index, e.target.value, 'percentage')}
                        className="w-24"
                      />
                      <span>%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{currencies.find(c => c.code === formData.currency)?.symbol}</span>
                      <Input
                        type="number"
                        value={absoluteValue.toFixed(2)}
                        onWheel={preventWheelChange}
                        onChange={(e) => handleValueChange(index, e.target.value, 'absolute')}
                        className="w-32"
                      />
                    </div>
                  </div>
                )
              })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetAlert(prev => ({ ...prev, mode: 'none' }))}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFormData(prev => ({ ...prev, expenses: localExpenses }))
                const newTotal = totalAllocation
                if (Math.abs(newTotal - 100) < 0.1) {
                  setBudgetAlert(prev => ({ ...prev, mode: 'none' }))
                } else {
                  setBudgetAlert(prev => ({
                    ...prev,
                    mode: 'initial',
                    totalPercentage: newTotal,
                    message: `Total budget allocation is still ${newTotal.toFixed(1)}%. Would you like to adjust automatically or continue manual adjustment?`
                  }))
                }
              }}
            >
              Save Adjustments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const handleSave = async () => {
    if (!session?.user) {
      signIn('google')
      return
    }

    try {
      const savedPlan = await saveTripPlan(formData, session.user.id)
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
                  error={errors.name ? { error: true, message: errors.name } : undefined}
                  required
                />
              </div>
            </CardContent>
          </>
        )
      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Select your destination</Label>
                <Combobox
                  options={[...countries]}
                  value={formData.country}
                  onValueChange={(value) => handleInputChange('country', value)}
                  placeholder="Select country"
                  className={getCurrencyTriggerClassName({ error: !!errors.country, message: errors.country })}
                />
                {errors.country && (
                  <p className="text-sm text-red-500">{errors.country}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select your travel dates</Label>
                <div className="flex flex-col space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={getDatePickerClassName({ error: !!errors.dates, message: errors.dates }, !!formData.startDate)}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, "PPP") : <span>Start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => date && handleInputChange('startDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={getDatePickerClassName({ error: !!errors.dates, message: errors.dates }, !!formData.endDate)}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, "PPP") : <span>End date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => date && handleInputChange('endDate', date)}
                        initialFocus
                        disabled={(date) => date < formData.startDate || date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {errors.dates && (
                  <p className="text-sm text-red-500">{errors.dates}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelers">Number of travelers</Label>
                <Select
                  value={formData.travelers.toString()}
                  onValueChange={(value) => handleInputChange('travelers', value)}
                >
                  <SelectTrigger 
                    id="travelers"
                    className={getCurrencyTriggerClassName({ error: !!errors.travelers, message: errors.travelers })}
                  >
                    <SelectValue placeholder="Select number of travelers">
                      {formData.travelers ? `${formData.travelers} ${formData.travelers === '1' ? 'traveler' : 'travelers'}` : 'Select number of travelers'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'traveler' : 'travelers'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.travelers && (
                  <p className="text-sm text-red-500">{errors.travelers}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Select your budget currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger 
                    id="currency" 
                    className={getCurrencyTriggerClassName({ error: !!errors.currency, message: errors.currency })}
                  >
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currency && (
                  <p className="text-sm text-red-500">{errors.currency}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="overallBudget">Overall Budget</Label>
                <div className="relative">
                  <Input
                    id="overallBudget"
                    type="number"
                    placeholder="Enter your overall budget"
                    value={formData.overallBudget}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^0+/, '') || '0'
                      handleInputChange('overallBudget', value)
                    }}
                    className={getBudgetInputClassName({ error: !!errors.budget, message: errors.budget })}
                    required
                  />
                  <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">
                      {currencies.find(c => c.code === formData.currency)?.symbol}
                    </span>
                  </div>
                </div>
                {errors.budget && (
                  <p className="text-sm text-red-500">{errors.budget}</p>
                )}
              </div>
            </CardContent>
          </>
        )
      case 3:
        return (
          <>
            <CardHeader>
              <CardTitle>Select Expense Categories</CardTitle>
              
            </CardHeader>
            <CardContent>
              <BudgetAllocation
                selectedCategories={formData.selectedCategories || DEFAULT_CATEGORIES}
                expenses={DEFAULT_EXPENSE_CATEGORIES.map(expense => ({
                  ...expense,
                  isExisting: formData.expenses?.some(e => e.key === expense.key && parseFloat(e.budgetValue) > 0)
                }))}
                onCategoryChange={handleCategorySelection}
                errors={errors}
              />
            </CardContent>
          </>
        )
      case 4:
        return (
          <>
            <CardContent className="p-0">
              <div className="w-full">
                <BudgetAllocationPreview
                  selectedCategories={formData.selectedCategories}
                  expenses={formData.expenses}
                  currency={formData.currency}
                  overallBudget={parseFloat(formData.overallBudget)}
                  onExpenseUpdate={handleExpenseUpdate}
                  estimates={estimates}
                />
              </div>
            </CardContent>
          </>
        )
      case 5:
        const summaryData: CategorySummary[] = formData.expenses
          .filter((expense: ExpenseData) => formData.selectedCategories.includes(expense.key))
            .map((expense: ExpenseData) => ({
              name: expense.name,
              key: expense.key,
              allocation: expense.budgetType === 'percentage' 
                ? parseFloat(expense.budgetValue)
                : calculateDefaultPercentage(parseFloat(expense.budgetValue)),
              allocatedAmount: expense.budgetType === 'percentage'
                ? parseFloat(formData.overallBudget) * parseFloat(expense.budgetValue) / 100
                : parseFloat(expense.budgetValue),
              defaultPercentage: expense.defaultPercentage,
              estimatedAmount: calculateAverageEstimate(expense.key as keyof ReturnType<typeof estimateCosts>),
              isPreBooked: expense.preBooked,
              isTracked: globalTracking,
              preBookedAmount: expense.preBooked && expense.cost ? parseFloat(expense.cost) : undefined
            }))

        return (
          <>
            <CardHeader>
              <CardTitle>Trip Budget Summary</CardTitle>
              <CardDescription>
                {format(formData.startDate, "PPP")} - {format(formData.endDate, "PPP")} • {formData.travelers} traveler(s) • {formData.country}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">
                    Total Budget: {formatCurrency(parseFloat(formData.overallBudget))}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    In {currencies.find(c => c.code === formData.currency)?.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={globalTracking}
                      onCheckedChange={setGlobalTracking}
                      id="tracking-toggle" 
                    />
                    <Label htmlFor="tracking-toggle">Enable Budget Tracking</Label>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Category</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Track</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((category) => {
                    const categoryColor = chartConfig[category.key as keyof typeof chartConfig].color

                    return (
                      <TableRow key={category.key}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{category.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Estimated: {formatCurrency(category.estimatedAmount)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{category.allocation.toFixed(1)}%</span>
                              <span className="text-muted-foreground">
                                {category.allocation > category.defaultPercentage ? '↑' : 
                                 category.allocation < category.defaultPercentage ? '↓' : '='}
                                {category.defaultPercentage}%
                              </span>
                            </div>
                            <Progress 
                              value={category.allocation} 
                              max={100}
                              className="h-2"
                              style={{
                                backgroundColor: 'var(--muted)',
                                ['--progress-background' as any]: categoryColor
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div>{formatCurrency(category.allocatedAmount)}</div>
                            {category.preBookedAmount && (
                              <div className="text-xs text-muted-foreground">
                                Pre-booked: {formatCurrency(category.preBookedAmount)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            category.isPreBooked 
                              ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                              : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                          )}>
                            {category.isPreBooked ? 'Pre-booked' : 'Planned'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch 
                            checked={globalTracking && category.isTracked}
                            disabled={!globalTracking}
                            onCheckedChange={(checked) => {
                              const updatedData = summaryData.map(item => 
                                item.key === category.key 
                                  ? { ...item, isTracked: checked }
                                  : item
                              )
                              // Handle tracking state update
                              console.log(`Tracking for ${category.name}: ${checked}`)
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <BudgetChart />

              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold">Budget Distribution Analysis</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {summaryData.map(category => (
                    <div key={category.key} className="flex items-center justify-between">
                      <span>{category.name}:</span>
                      <span className={cn(
                        category.allocation > category.defaultPercentage ? "text-yellow-600" :
                        category.allocation < category.defaultPercentage ? "text-blue-600" :
                        "text-green-600"
                      )}>
                        {category.allocation > category.defaultPercentage ? 'Above average' :
                         category.allocation < category.defaultPercentage ? 'Below average' :
                         'Average'} ({category.defaultPercentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </>
        )
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

  return (
    <Card className="w-full shadow-sm mx-0 max-w-none rounded-lg">
      <div className="flex items-center justify-between border-b p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            {formData.name || 'New Trip'}
          </h2>
          {step > 2 && formData.country && (
            <div className="text-sm text-muted-foreground">
              {formData.country}
              {formData.startDate && formData.endDate && (
                <span className="ml-2">
                  • {format(formData.startDate, "MMM d")} - {format(formData.endDate, "MMM d, yyyy")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {renderSavingIndicator()}
          {initialData && (
            <>
              <Button variant="outline" onClick={onBack}>
                Back to Trips
              </Button>
              <Button variant="outline" onClick={() => router.push('/trip-monitor')}>
                Open Monitor
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
        {renderStep()}
      </div>

      <CardFooter className="flex justify-between border-t px-6 py-4 mt-auto">
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

