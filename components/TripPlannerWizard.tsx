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
import { validateStep } from '@/components/trip-planner/form-validation'

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

const defaultExpenses = [
  { name: 'Flights', key: 'flight', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '30', defaultPercentage: 30 },
  { name: 'Accommodation', key: 'accommodation', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '30', defaultPercentage: 30 },
  { name: 'Local Transportation', key: 'localTransportation', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '10', defaultPercentage: 10 },
  { name: 'Food & Beverages', key: 'food', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '15', defaultPercentage: 15 },
  { name: 'Cultural Activities', key: 'activities', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '10', defaultPercentage: 10 },
  { name: 'Shopping', key: 'shopping', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '5', defaultPercentage: 5 },
  { name: 'Car Rental', key: 'carRental', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '0', defaultPercentage: 0 },
] as const

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
  initialData?: TripPlan;
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

export function TripPlannerWizard({ initialData, onBack }: TripPlannerWizardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<TripPlanData>(() => {
    if (initialData) {
      // When editing, map existing expenses to form data
      const existingExpenseKeys = initialData.expenses.map(e => e.key)
      
      return {
        id: initialData.id,
        name: initialData.name,
        status: initialData.status,
        country: initialData.country || "",
        startDate: initialData.startDate ? new Date(initialData.startDate) : new Date(),
        endDate: initialData.endDate ? new Date(initialData.endDate) : new Date(),
        travelers: initialData.travelers?.toString() || "1",
        currency: initialData.currency || "USD",
        overallBudget: initialData.overallBudget?.toString() || "",
        selectedCategories: existingExpenseKeys, // Use the actual selected categories
        expenses: defaultExpenses.map(expense => {
          // Find matching expense from initialData
          const existingExpense = initialData.expenses.find(e => e.key === expense.key)
          if (existingExpense) {
            return {
              ...expense,
              preBooked: existingExpense.preBooked,
              cost: existingExpense.cost?.toString() || '',
              budgetType: existingExpense.budgetType as 'percentage' | 'absolute',
              budgetValue: existingExpense.budgetValue.toString(),
              defaultPercentage: existingExpense.defaultPercentage,
            }
          }
          // For categories not in initialData, use defaults
          return {
            ...expense,
            budgetValue: existingExpenseKeys.includes(expense.key) ? 
              expense.defaultPercentage.toString() : '0',
          }
        }),
      }
    }
    
    // Default state for new trip
    return {
      name: "",
      status: 'DRAFT',
      country: "",
      startDate: new Date(),
      endDate: new Date(),
      travelers: "1",
      currency: "USD",
      overallBudget: "",
      selectedCategories: DEFAULT_CATEGORIES,
      expenses: defaultExpenses.map(expense => ({
        ...expense,
        budgetValue: DEFAULT_CATEGORIES.includes(expense.key) ? 
          expense.defaultPercentage.toString() : '0',
      })),
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCategorySelection = (selectedKeys: string[]) => {
    console.log('Selected categories:', selectedKeys) // Debug log
    
    setFormData(prev => {
      // Update selected categories
      const newSelectedCategories = selectedKeys

      // Update expenses with new selections
      const newExpenses = prev.expenses.map(expense => {
        if (newSelectedCategories.includes(expense.key)) {
          // Keep existing expense data if it's selected
          return expense
        }
        // Reset unselected categories with explicit type
        return {
          ...expense,
          preBooked: false,
          budgetType: 'percentage' as const,
          budgetValue: '0'
        }
      })

      console.log('Updated form data:', {
        selectedCategories: newSelectedCategories,
        expensesCount: newExpenses.length
      })

      return {
        ...prev,
        selectedCategories: newSelectedCategories,
        expenses: newExpenses
      }
    })

    // Clear category error when selections are made
    if (selectedKeys.length > 0) {
      setErrors(prev => ({ ...prev, categories: '' }))
    }
  }

  const handleExpenseChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map((expense, i) => {
        if (i === index) {
          return { ...expense, [field]: value }
        }
        return expense
      })
    }))
  }

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
            .filter(expense => formData.selectedCategories.includes(expense.key))
            .map(expense => ({
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
    console.log('handleNext called, current step:', step)
    if (validateStep(step, formData, setErrors)) {
      try {
        if (step === 1) {
          // Create initial plan with name only
          const response = await fetch('/api/trip-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.name }),
          })

          if (!response.ok) throw new Error('Failed to create trip plan')
          const data = await response.json()
          setFormData(prev => ({ ...prev, id: data.id }))
        } 
        else if (step === 2) {
          // Save trip details
          const response = await fetch(`/api/trip-plans/${formData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              country: formData.country,
              startDate: formData.startDate,
              endDate: formData.endDate,
              travelers: parseInt(formData.travelers),
              currency: formData.currency,
              overallBudget: parseFloat(formData.overallBudget),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to update trip details')
          }
        }

        setStep(prev => prev + 1)
      } catch (error) {
        console.error('Error in handleNext:', error)
        setError(error instanceof Error ? error.message : 'Failed to save plan')
      }
    } else {
      console.log('Step validation failed, errors:', errors)
    }
  }

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
      .filter(expense => 
        formData.selectedCategories.includes(expense.key) &&
        !expense.preBooked &&
        ((expense.budgetType === 'percentage' && parseFloat(expense.budgetValue) > expense.defaultPercentage) ||
         (expense.budgetType === 'absolute' && 
          parseFloat(expense.budgetValue) > (parseFloat(formData.overallBudget) * expense.defaultPercentage / 100)))
      )
      .map(expense => ({
        name: expense.name,
        key: expense.key,
        current: expense.budgetType === 'percentage' 
          ? `${expense.budgetValue}%`
          : formatCurrency(parseFloat(expense.budgetValue)),
        default: `${expense.defaultPercentage}%`
      }))
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
                  error={errors.name}
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
                  onValueChange={(value) => {
                    handleInputChange('country', value)
                    setErrors(prev => ({ ...prev, country: '' }))
                  }}
                  placeholder="Select country"
                  className={cn(
                    errors.country ? 'border-red-500 ring-1 ring-red-500' : ''
                  )}
                  error={!!errors.country}
                  emptyText="No countries found"
                />
                {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
              </div>
              <div className="space-y-2">
                <Label>Select your travel dates</Label>
                <div className="flex flex-col space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground",
                          errors.dates ? 'border-red-500 ring-1 ring-red-500' : ''
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? (
                          format(formData.startDate, "PPP")
                        ) : (
                          <span>Start date</span>
                        )}
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
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground",
                          errors.dates ? 'border-red-500 ring-1 ring-red-500' : ''
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? (
                          format(formData.endDate, "PPP")
                        ) : (
                          <span>End date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => date && handleInputChange('endDate', date)}
                        initialFocus
                        disabled={(date) => 
                          date < formData.startDate || 
                          date < new Date()
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {errors.dates && <p className="text-sm text-red-500">{errors.dates}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="travelers">Number of travelers</Label>
                <Select
                  value={formData.travelers}
                  onValueChange={(value) => handleInputChange('travelers', value)}
                >
                  <SelectTrigger id="travelers">
                    <SelectValue placeholder="Select number of travelers" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Select your budget currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger id="currency" className="w-full">
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
                    className={cn(
                      "w-full pl-8",
                      errors.budget ? 'border-2 border-red-500 focus:ring-red-500' : ''
                    )}
                    required
                  />
                  <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">
                      {currencies.find(c => c.code === formData.currency)?.symbol}
                    </span>
                  </div>
                </div>
                {errors.budget && (
                  <p className="text-sm text-red-500">Budget is required</p>
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
              <CardDescription>
                Select at least one expense category for your trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "space-y-4",
                errors.categories ? 'p-4 border border-red-500 rounded-lg' : ''
              )}>
                {defaultExpenses.map((expense) => (
                  <div key={expense.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${expense.key}`}
                      checked={formData.selectedCategories.includes(expense.key)}
                      onCheckedChange={(checked) => {
                        const newSelectedCategories = checked
                          ? [...formData.selectedCategories, expense.key]
                          : formData.selectedCategories.filter(key => key !== expense.key)
                        
                        // Ensure at least one category is selected
                        if (newSelectedCategories.length > 0) {
                          handleCategorySelection(newSelectedCategories)
                          setErrors(prev => ({ ...prev, categories: '' }))
                        } else {
                          setErrors(prev => ({ 
                            ...prev, 
                            categories: 'At least one category must be selected' 
                          }))
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`category-${expense.key}`}
                      className={cn(
                        DEFAULT_CATEGORIES.includes(expense.key) && "font-medium"
                      )}
                    >
                      {expense.name}
                      {DEFAULT_CATEGORIES.includes(expense.key) && " (Recommended)"}
                    </Label>
                  </div>
                ))}
                {errors.categories && (
                  <p className="text-sm text-red-500 mt-2">{errors.categories}</p>
                )}
              </div>
            </CardContent>
          </>
        )
      case 4:
        return (
          <>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2 px-6 pb-2">
                <Switch
                  id="show-overspend-alerts"
                  checked={showOverspendAlerts}
                  onCheckedChange={setShowOverspendAlerts}
                />
                <Label htmlFor="show-overspend-alerts">
                  Show alerts when budget is overspent
                </Label>
              </div>
              {formData.expenses.filter(expense => formData.selectedCategories.includes(expense.key)).map((expense, filteredIndex) => {
                const totalAllocated = calculateTotalPercentage()
                const isOverspent = totalAllocated > 100 && (
                  (expense.budgetType === 'percentage' && parseFloat(expense.budgetValue) > expense.defaultPercentage) ||
                  (expense.budgetType === 'absolute' && 
                   parseFloat(expense.budgetValue) > (parseFloat(formData.overallBudget) * expense.defaultPercentage / 100))
                )
                const categoryColor = chartConfig[expense.key as keyof typeof chartConfig].color

                return (
                  <div 
                    key={expense.key} 
                    className={cn(
                      "space-y-4 p-4 border rounded-lg",
                      isOverspent && "border-red-500 bg-red-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <Label 
                          htmlFor={expense.key}
                          className={cn(isOverspent && "text-red-600 font-medium")}
                        >
                          {expense.name}
                          {isOverspent && (
                            <span className="ml-2 text-sm">
                              (Exceeds {expense.defaultPercentage}% default)
                            </span>
                          )}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`${expense.key}-prebooked`}>Pre-booked</Label>
                        <Switch
                          id={`${expense.key}-prebooked`}
                          checked={expense.preBooked}
                          onCheckedChange={(checked) => {
                            handleExpenseChange(filteredIndex, 'preBooked', checked);
                            if (checked) {
                              handleExpenseChange(filteredIndex, 'budgetType', 'absolute');
                            }
                          }}
                        />
                      </div>
                    </div>

                    {expense.preBooked ? (
                      <div className="space-y-2">
                        <Label htmlFor={`${expense.key}-cost`}>Cost</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            {currencies.find(c => c.code === formData.currency)?.symbol}
                          </span>
                          <Input
                            id={`${expense.key}-cost`}
                            type="number"
                            placeholder={`Enter ${expense.name.toLowerCase()} cost`}
                            value={expense.cost}
                            onWheel={preventWheelChange}
                            onChange={(e) => handleExpenseChange(filteredIndex, 'cost', e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {renderCostEstimate(expense.key as keyof ReturnType<typeof estimateCosts>)}
                        <div className="space-y-2">
                          <Tabs
                            value={expense.budgetType}
                            onValueChange={(value) => {
                              const newType = value as 'percentage' | 'absolute'
                              const currentValue = parseFloat(expense.budgetValue) || 0
                              const overallBudget = parseFloat(formData.overallBudget) || 1 // Prevent division by zero
                              
                              let newValue: string
                              
                              if (newType === 'absolute') {
                                // Converting from percentage to absolute
                                newValue = ((currentValue / 100) * overallBudget).toFixed(2)
                              } else {
                                // Converting from absolute to percentage
                                newValue = ((currentValue / overallBudget) * 100).toFixed(1)
                              }

                              // First update the budget type
                              handleExpenseChange(filteredIndex, 'budgetType', newType)
                              // Then update the value
                              handleExpenseChange(filteredIndex, 'budgetValue', newValue)
                            }}
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="percentage">Percentage</TabsTrigger>
                              <TabsTrigger value="absolute">Absolute</TabsTrigger>
                            </TabsList>
                          </Tabs>

                          <div className="space-y-2">
                            <Label htmlFor={`${expense.key}-budgetValue`}>
                              {expense.budgetType === 'percentage' ? 'Budget Percentage' : 'Budget Amount'}
                            </Label>
                            <div className="relative">
                              {expense.budgetType === 'absolute' && (
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                  {currencies.find(c => c.code === formData.currency)?.symbol}
                                </span>
                              )}
                              <Input
                                id={`${expense.key}-budgetValue`}
                                type="number"
                                min="0"
                                max={expense.budgetType === 'percentage' ? "100" : undefined}
                                step={expense.budgetType === 'percentage' ? "0.1" : "0.01"}
                                placeholder={expense.budgetType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                                value={expense.budgetValue}
                                onWheel={preventWheelChange}
                                onFocus={() => {
                                  setInputState({ isEditing: true, category: expense.key })
                                  setShownAlerts(prev => {
                                    const newSet = new Set(prev || [])
                                    newSet.delete(expense.key)
                                    return newSet
                                  })
                                }}
                                onBlur={async () => {
                                  await new Promise(resolve => setTimeout(resolve, 0))
                                  setInputState({ isEditing: false, category: '' })
                                  
                                  if (showOverspendAlerts && !shownAlerts?.has(expense.key)) {
                                    const totalPercentage = calculateTotalPercentage()
                                    if (totalPercentage > 100) {
                                      const overSpentCategories = getOverspentCategories()
                                      if (overSpentCategories.some(cat => cat.key === expense.key)) {
                                        setBudgetAlert({
                                          show: true,
                                          mode: 'initial',
                                          message: `Budget is overspent (${totalPercentage.toFixed(1)}%). Would you like to adjust automatically or manually?`,
                                          totalPercentage,
                                          action: adjustPercentagesAutomatically
                                        })
                                        setShownAlerts(prev => {
                                          const newSet = new Set(prev || [])
                                          newSet.add(expense.key)
                                          return newSet
                                        })
                                      }
                                    }
                                  }
                                }}
                                onChange={async (e) => {
                                  const value = expense.budgetType === 'percentage' 
                                    ? validatePercentageInput(e.target.value)
                                    : e.target.value
                                  
                                  await handleExpenseChange(filteredIndex, 'budgetValue', value)
                                }}
                                className={expense.budgetType === 'absolute' ? 'pl-8' : ''}
                              />
                            </div>
                            {expense.budgetType === 'percentage' && (
                              <p className="text-sm text-gray-500">
                                Amount: {formatCurrency(parseFloat(formData.overallBudget) * parseFloat(expense.budgetValue) / 100)}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              <div className="text-sm font-medium">
                Remaining unallocated budget: {formatCurrency(calculateRemainingBudget())}
              </div>
              <BudgetChart />
              <BudgetAlertDialog />
            </CardContent>
          </>
        )
      case 5:
        const summaryData: CategorySummary[] = formData.expenses
          .filter(expense => formData.selectedCategories.includes(expense.key))
          .map(expense => ({
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
            preBookedAmount: expense.preBooked ? parseFloat(expense.cost) : undefined
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
              .map((expense, index) => {
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

  return (
    <div className="space-y-4">
      {initialData && onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trip Details
        </Button>
      )}
      <Card className="w-full max-w-2xl mx-auto shadow-sm">
        {renderStep()}
        <CardFooter className="flex justify-between border-t bg-muted/10 mt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isSubmitting}
            >
              Back
            </Button>
          )}
          {step < STEPS.length && ( // Only show Next/Save button if not on the last step
            <Button 
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Next'
              )}
            </Button>
          )}
        </CardFooter>
        <BudgetAlertDialog />
        <ManualAdjustmentDialog />
      </Card>
    </div>
  )
}

