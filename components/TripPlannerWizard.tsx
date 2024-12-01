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

type ExpenseCategory = {
  name: string;
  key: string;
  preBooked: boolean;
  cost: string;
  budgetType: 'percentage' | 'absolute';
  budgetValue: string;
  defaultPercentage: number;
}

const defaultExpenses: ExpenseCategory[] = [
  { name: 'Flights', key: 'flight', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '30', defaultPercentage: 30 },
  { name: 'Accommodation', key: 'accommodation', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '30', defaultPercentage: 30 },
  { name: 'Local Transportation', key: 'localTransportation', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '10', defaultPercentage: 10 },
  { name: 'Food & Beverages', key: 'food', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '15', defaultPercentage: 15 },
  { name: 'Cultural Activities', key: 'activities', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '10', defaultPercentage: 10 },
  { name: 'Shopping', key: 'shopping', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '5', defaultPercentage: 5 },
  { name: 'Car Rental', key: 'carRental', preBooked: false, cost: '', budgetType: 'percentage', budgetValue: '0', defaultPercentage: 0 },
]

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

// Add this constant for default categories
const DEFAULT_CATEGORIES = ['flight', 'accommodation', 'food', 'shopping']

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

export function TripPlannerWizard() {
  const { data: session } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [tripData, setTripData] = useState({
    country: '',
    startDate: new Date(),
    endDate: new Date(),
    travelers: '1',
    currency: 'USD',
    overallBudget: '',
    selectedCategories: DEFAULT_CATEGORIES, // Initialize with default categories
    expenses: defaultExpenses.map(expense => ({
      ...expense,
      budgetValue: DEFAULT_CATEGORIES.includes(expense.key) ? expense.defaultPercentage.toString() : '0',
    })),
  })

  const [costEstimates, setCostEstimates] = useState<ReturnType<typeof estimateCosts> | null>(null)

  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const [budgetAlert, setBudgetAlert] = useState<BudgetAlert>({
    show: false,
    message: '',
    totalPercentage: 100,
    mode: 'none'
  })

  const [_inputState, setInputState] = useState<InputState>({
    isEditing: false,
    category: ''
  })

  const [shownAlerts, setShownAlerts] = useState<Set<string>>(new Set())

  const [showOverspendAlerts, setShowOverspendAlerts] = useState(true)

  const [globalTracking, setGlobalTracking] = useState(true)

  const nights = useMemo(() => {
    return Math.ceil((tripData.endDate.getTime() - tripData.startDate.getTime()) / (1000 * 3600 * 24))
  }, [tripData.startDate, tripData.endDate])

  useEffect(() => {
    if (tripData.country && tripData.travelers && nights > 0) {
      const estimates = estimateCosts(tripData.country, parseInt(tripData.travelers), nights, tripData.startDate)
      setCostEstimates(estimates)
    }
  }, [tripData.country, tripData.travelers, nights, tripData.startDate])

  const handleInputChange = (field: string, value: any) => {
    setTripData(prev => ({ ...prev, [field]: value }))
  }

  const handleExpenseChange = (index: number, field: keyof ExpenseCategory, value: any) => {
    return new Promise<void>((resolve) => {
      setTripData(prev => {
        // Find the actual expense by key instead of using index
        const expenseKey = prev.expenses
          .filter(expense => prev.selectedCategories.includes(expense.key))[index].key

        const newExpenses = prev.expenses.map(expense => {
          if (expense.key === expenseKey) {
            // Validate percentage input
            if (field === 'budgetValue' && expense.budgetType === 'percentage') {
              return { ...expense, [field]: validatePercentageInput(value) }
            }
            return { ...expense, [field]: value }
          }
          return expense
        })
        
        return {
          ...prev,
          expenses: newExpenses
        }
      })
      resolve()
    })
  }

  const handleCategorySelection = (selectedKeys: string[]) => {
    setTripData(prev => {
      // Calculate current total percentage excluding newly added categories
      const currentTotal = prev.expenses
        .filter(expense => prev.selectedCategories.includes(expense.key))
        .reduce((total, expense) => {
          if (expense.budgetType === 'percentage') {
            return total + (parseFloat(expense.budgetValue) || 0)
          }
          return total + calculateDefaultPercentage(parseFloat(expense.budgetValue) || 0)
        }, 0)

      // Find newly added categories
      const newCategories = selectedKeys.filter(key => !prev.selectedCategories.includes(key))
      
      return {
        ...prev,
        selectedCategories: selectedKeys,
        expenses: prev.expenses.map(expense => {
          if (newCategories.includes(expense.key)) {
            // New categories start with 0% to maintain current total
            return {
              ...expense,
              preBooked: false,
              budgetType: 'percentage',
              budgetValue: '0'
            }
          }
          if (!selectedKeys.includes(expense.key)) {
            // Reset unselected categories
            return {
              ...expense,
              preBooked: false,
              budgetType: 'percentage',
              budgetValue: '0'
            }
          }
          // Keep existing categories as they are
          return expense
        })
      }
    })
  }

  const validateStep = (currentStep: number): boolean => {
    const newErrors: {[key: string]: string} = {}

    switch (currentStep) {
      case 1:
        if (!tripData.country) {
          newErrors.country = 'Please select a destination'
        }
        if (!tripData.startDate || !tripData.endDate) {
          newErrors.dates = 'Please select both start and end dates'
        }
        if (!tripData.overallBudget || parseFloat(tripData.overallBudget) <= 0) {
          newErrors.budget = 'Please enter a valid budget amount'
        }
        break
      case 2:
        if (tripData.selectedCategories.length === 0) {
          newErrors.categories = 'Please select at least one expense category'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 3) {
        const totalAllocated = calculateTotalPercentage()
        const overSpentCategories = getOverspentCategories()

        if (totalAllocated !== 100) {
          setBudgetAlert({
            show: true,
            mode: 'initial',
            message: 'Please allocate exactly 100% of the budget before proceeding.',
            totalPercentage: totalAllocated,
            action: adjustPercentagesAutomatically
          })
          return
        }

        if (totalAllocated > 100) {
          setBudgetAlert({
            show: true,
            mode: 'initial',
            message: `Budget is overspent by ${(totalAllocated - 100).toFixed(1)}%. Please adjust the allocation before proceeding.`,
            totalPercentage: totalAllocated,
            action: adjustPercentagesAutomatically
          })
          return
        }
      }
      setShownAlerts(new Set())
      setStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setShownAlerts(new Set())
    setStep(prev => prev - 1)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tripData.currency,
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
    const budget = parseFloat(tripData.overallBudget)
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
    const overallBudget = parseFloat(tripData.overallBudget) || 0
    const allocatedBudget = tripData.expenses
      .filter(expense => tripData.selectedCategories.includes(expense.key))
      .reduce((total, expense) => {
        if (expense.budgetType === 'absolute') {
          return total + (parseFloat(expense.budgetValue) || 0)
        }
        return total + (overallBudget * parseFloat(expense.budgetValue) / 100)
      }, 0)
    return overallBudget - allocatedBudget
  }

  const calculateTotalPercentage = () => {
    return tripData.expenses
      .filter(expense => tripData.selectedCategories.includes(expense.key))
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

    const selectedExpenses = tripData.expenses
      .filter(expense => 
        tripData.selectedCategories.includes(expense.key) && 
        expense.budgetType === 'percentage'
      )

    // Calculate adjustment factor
    const adjustmentFactor = 100 / currentTotal

    // First pass: adjust all percentages
    let updatedExpenses = tripData.expenses.map(expense => {
      if (tripData.selectedCategories.includes(expense.key) && expense.budgetType === 'percentage') {
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
      .filter(expense => tripData.selectedCategories.includes(expense.key))
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

    setTripData(prev => ({
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

    return tripData.expenses
      .filter(expense => 
        tripData.selectedCategories.includes(expense.key) &&
        !expense.preBooked &&
        ((expense.budgetType === 'percentage' && parseFloat(expense.budgetValue) > expense.defaultPercentage) ||
         (expense.budgetType === 'absolute' && 
          parseFloat(expense.budgetValue) > (parseFloat(tripData.overallBudget) * expense.defaultPercentage / 100)))
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
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Select your destination</Label>
                <Combobox
                  options={[...countries]}
                  value={tripData.country}
                  onValueChange={(value) => {
                    handleInputChange('country', value)
                    setErrors(prev => ({ ...prev, country: '' }))
                  }}
                  placeholder="Select country"
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
                          !tripData.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tripData.startDate ? (
                          format(tripData.startDate, "PPP")
                        ) : (
                          <span>Start date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tripData.startDate}
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
                          !tripData.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tripData.endDate ? (
                          format(tripData.endDate, "PPP")
                        ) : (
                          <span>End date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tripData.endDate}
                        onSelect={(date) => date && handleInputChange('endDate', date)}
                        initialFocus
                        disabled={(date) => 
                          date < tripData.startDate || 
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
                  value={tripData.travelers}
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
                  value={tripData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Choose a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="overallBudget">Overall Budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    {currencies.find(c => c.code === tripData.currency)?.symbol}
                  </span>
                  <Input
                    id="overallBudget"
                    type="number"
                    placeholder="Enter your overall budget"
                    value={tripData.overallBudget}
                    onWheel={preventWheelChange}
                    onChange={(e) => {
                      handleInputChange('overallBudget', e.target.value)
                      setErrors(prev => ({ ...prev, budget: '' }))
                    }}
                    className={cn("pl-8", errors.budget ? 'border-red-500' : '')}
                  />
                </div>
                {errors.budget && <p className="text-sm text-red-500">{errors.budget}</p>}
              </div>
            </CardContent>
          </>
        )
      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle>Select Expense Categories</CardTitle>
              <CardDescription>
                Flight, Accommodation, Food & Beverages, and Shopping are included by default
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {defaultExpenses.map((expense) => (
                  <div key={expense.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${expense.key}`}
                      checked={tripData.selectedCategories.includes(expense.key)}
                      disabled={DEFAULT_CATEGORIES.includes(expense.key)} // Disable default categories
                      onCheckedChange={(checked) => {
                        const newSelectedCategories = checked
                          ? [...tripData.selectedCategories, expense.key]
                          : tripData.selectedCategories.filter(key => key !== expense.key)
                        handleCategorySelection(newSelectedCategories)
                        setErrors(prev => ({ ...prev, categories: '' }))
                      }}
                    />
                    <Label 
                      htmlFor={`category-${expense.key}`}
                      className={cn(
                        DEFAULT_CATEGORIES.includes(expense.key) && "font-medium text-primary"
                      )}
                    >
                      {expense.name}
                      {DEFAULT_CATEGORIES.includes(expense.key) && " (Required)"}
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
      case 3:
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
              {tripData.expenses.filter(expense => tripData.selectedCategories.includes(expense.key)).map((expense, filteredIndex) => {
                const totalAllocated = calculateTotalPercentage()
                const isOverspent = totalAllocated > 100 && (
                  (expense.budgetType === 'percentage' && parseFloat(expense.budgetValue) > expense.defaultPercentage) ||
                  (expense.budgetType === 'absolute' && 
                   parseFloat(expense.budgetValue) > (parseFloat(tripData.overallBudget) * expense.defaultPercentage / 100))
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
                            {currencies.find(c => c.code === tripData.currency)?.symbol}
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
                              const overallBudget = parseFloat(tripData.overallBudget) || 1 // Prevent division by zero
                              
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
                                  {currencies.find(c => c.code === tripData.currency)?.symbol}
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
                                Amount: {formatCurrency(parseFloat(tripData.overallBudget) * parseFloat(expense.budgetValue) / 100)}
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
      case 4:
        const summaryData: CategorySummary[] = tripData.expenses
          .filter(expense => tripData.selectedCategories.includes(expense.key))
          .map(expense => ({
            name: expense.name,
            key: expense.key,
            allocation: expense.budgetType === 'percentage' 
              ? parseFloat(expense.budgetValue)
              : calculateDefaultPercentage(parseFloat(expense.budgetValue)),
            allocatedAmount: expense.budgetType === 'percentage'
              ? parseFloat(tripData.overallBudget) * parseFloat(expense.budgetValue) / 100
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
                {format(tripData.startDate, "PPP")} - {format(tripData.endDate, "PPP")} • {tripData.travelers} traveler(s) • {tripData.country}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">
                    Total Budget: {formatCurrency(parseFloat(tripData.overallBudget))}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    In {currencies.find(c => c.code === tripData.currency)?.name}
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
    const allocatedData = tripData.expenses
      .filter(expense => tripData.selectedCategories.includes(expense.key))
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

    const totalBudget = formatCurrency(parseFloat(tripData.overallBudget))

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
    const [localExpenses, setLocalExpenses] = useState(tripData.expenses)
    const [totalAllocation, setTotalAllocation] = useState(budgetAlert.totalPercentage)
    const overallBudget = parseFloat(tripData.overallBudget) || 1

    useEffect(() => {
      const newTotal = localExpenses
        .filter(expense => 
          tripData.selectedCategories.includes(expense.key) &&
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
                tripData.selectedCategories.includes(expense.key) && 
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
                      <span>{currencies.find(c => c.code === tripData.currency)?.symbol}</span>
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
                setTripData(prev => ({ ...prev, expenses: localExpenses }))
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
      const savedPlan = await saveTripPlan(tripData, session.user.id)
      router.push(`/trip-plans/${savedPlan.id}`)
    } catch (error) {
      // Handle error (show toast notification, etc.)
      console.error('Failed to save trip plan:', error)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      {renderStep()}
      <CardFooter className="flex justify-between border-t bg-muted/10 mt-6">
        {step > 1 && (
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
        )}
        {step < 4 ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button 
            onClick={handleSave}
            disabled={!session?.user}
            className="bg-primary hover:bg-primary/90"
          >
            {session?.user ? 'Save Trip Plan' : 'Sign in to Save'}
          </Button>
        )}
      </CardFooter>
      <BudgetAlertDialog />
      <ManualAdjustmentDialog />
    </Card>
  )
}

