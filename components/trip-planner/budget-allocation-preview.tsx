'use client'

import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { TripExpenseCategory, City } from "@/types/trip"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Trash2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/currency';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ReferenceModal } from './reference-modal'
import { InfoIcon } from "lucide-react"
import { getPerplexityEstimates } from '@/lib/cost-estimation/perplexity';
import { CategoryEstimate } from '@/types/cost-estimation';
import { useToast } from "@/components/ui/use-toast";
import { CATEGORY_TIER_PRICES } from '@/lib/cost-estimation/perplexity';

type PriceTier = 'budget' | 'medium' | 'premium';

type GeoPosition = {
  latitude: number;
  longitude: number;
};

interface ExpenseData {
  id: string;
  tripPlanId: string;
  name: string;
  key: string;
  preBooked: boolean;
  budgetType: 'percentage' | 'absolute';
  budgetValue: number;
  cost: number;
  defaultPercentage: number;
  selectedTier?: PriceTier;
  estimates?: any;
  createdAt: Date;
  updatedAt: Date;
  isManuallySet?: boolean;
}

interface TierEstimate {
  min: number;
  max: number;
  average: number;
  confidence: number;
  source: string;
  references: string[];
}

interface CategoryEstimates {
  budget: TierEstimate;
  medium: TierEstimate;
  premium: TierEstimate;
  [key: string]: TierEstimate;  // Add index signature
}

interface BudgetAllocationPreviewProps {
  selectedCategories: string[];
  expenses: ExpenseData[];
  currency: string;
  overallBudget: number;
  country: string;
  startDate: string;
  endDate: string;
  travelers: number;
  cities: City[];
  departureLocation: string;
  onExpenseUpdate: UpdateExpenseFunction;
  estimates: Record<string, CategoryEstimate> | undefined;
  onEstimatesUpdate: (estimates: any) => void;
  onAdjustBudget: () => void;
  onCategoriesChange: () => void;
  onNext: () => void;
  onAdjustDuration: (newDays: number) => Promise<void>;
  numberOfDays: number;
  tripId: string;
  isEditing: boolean;
}

interface BudgetStats {
  totalAllocation: number;
  allocations: Array<{
    key: string;
    name: string;
    value: number;
    color: string;
  }>;
  isValid: boolean;
  allocated: {
    percentage: number;
    amount: number;
  };
}

const categoryColors = {
  flight: "#F87171",
  accommodation: "#FB923C",
  localTransportation: "#FBBF24",
  food: "#A3E635",
  activities: "#4ADE80",
  shopping: "#2DD4BF",
  carRental: "#22D3EE",
} as const

interface BudgetAlert {
  show: boolean;
  message: string;
  totalPercentage: number;
  mode: 'initial' | 'manual' | 'none';
}

const validatePercentageInput = (value: string): string => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return '0'
  return Math.min(100, Math.max(0, numValue)).toString()
}

interface PriceTierOption {
  tier: 'budget' | 'medium' | 'premium';
  estimate: {
    min: number;
    max: number;
    average: number;
    confidence: number;
  };
}

// Helper function to get the unit label
const getUnitLabel = (category: string): string => {
  switch (category) {
    case 'accommodation':
    case 'localTransportation':
    case 'carRental':
      return 'per day';
    case 'food':
    case 'activities':
      return 'per person/day';
    case 'flight':
      return 'per person';
    default:
      return 'total';
  }
};

// Compact loading dots for accordion header
const HeaderLoadingDots = () => (
  <div className="flex items-center space-x-1">
    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></div>
  </div>
);

// Full loading state for accordion content
const EstimatesLoadingState = () => (
  <div className="mt-4 p-4 border rounded-lg bg-muted/10">
    <div className="flex items-center justify-center space-x-2">
      <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce"></div>
    </div>
    <p className="text-center text-sm text-muted-foreground mt-2">
      Fetching estimates...
    </p>
  </div>
);

// Update the tooltip props interface
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      color: string;
      expense?: TripExpenseCategory;
    };
  }>;
  overallBudget: number;
  currency: string;
}

// Update the CustomTooltip component
const CustomTooltip = ({ active, payload, overallBudget, currency }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const expense = data.expense;
    
    return (
      <div 
        className="bg-white p-3 shadow-lg rounded-lg border"
        style={{
          transition: 'all 0.2s ease',
          transform: 'scale(1)',
          opacity: 1
        }}
      >
        <p className="font-medium text-base">{data.name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {data.value.toFixed(1)}% ({formatCurrency(data.value * overallBudget / 100, currency)})
        </p>
        {expense && (
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            {expense.selectedTier || 'medium'} tier
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Update the BudgetCheckResult interface
interface BudgetCheckResult {
  type: 'overspend' | 'underspend' | 'balanced';
  totalAllocated: number;
  difference: number;
}

// Update the checkBudgetAllocation function
const checkBudgetAllocation = (
  expenses: TripExpenseCategory[],
  selectedCategories: string[]
): BudgetCheckResult => {
  const totalAllocated = expenses
    .filter(exp => selectedCategories.includes(exp.key))
    .reduce((sum, exp) => {
      const value = parseFloat(exp.budgetValue?.toString() || '0');
      return sum + value;
    }, 0);

  const isNear100 = Math.abs(totalAllocated - 100) < 0.1;

  if (isNear100) {
    return {
      type: 'balanced',
      totalAllocated: 100,
      difference: 0
    };
  }

  return {
    type: totalAllocated > 100 ? 'overspend' : 'underspend',
    totalAllocated,
    difference: Math.abs(100 - totalAllocated)
  };
};

// Add new handler type for duration adjustment
interface BudgetAlertDialogProps {
  open: boolean;
  onClose: () => void;
  checkResult: BudgetCheckResult;
  onAdjustBudget: () => void;
  onAdjustCategories: () => void;
  onAdjustAllocation: () => void;
  onAdjustDuration: () => void;  // New handler
  currency: string;
  overallBudget: number;
}

// Update the BudgetAlertDialog component
const BudgetAlertDialog = ({
  open,
  onClose,
  checkResult,
  onAdjustBudget,
  onAdjustCategories,
  onAdjustAllocation,
  onAdjustDuration,
  currency,
  overallBudget
}: BudgetAlertDialogProps) => {
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleProceed = async () => {
    try {
      switch (selectedOption) {
        case 'categories':
          await onAdjustCategories();
          break;
        case 'allocation':
          await onAdjustAllocation();
          break;
        case 'budget':
          await onAdjustBudget();
          break;
        case 'duration':
          await onAdjustDuration();
          break;
        default:
          break;
      }
      
      // Reset selected option
      setSelectedOption('');
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error handling budget adjustment:', error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to adjust budget. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Budget {checkResult.type === 'underspend' ? 'Underspend' : 'Overspend'} Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Your current budget allocation is {checkResult.totalAllocated.toFixed(1)}% 
              ({formatCurrency(checkResult.totalAllocated * overallBudget / 100, currency)})
              {checkResult.type === 'underspend' ? ' below ' : ' above '} 
              the total budget by {checkResult.difference.toFixed(1)}% 
              ({formatCurrency(checkResult.difference * overallBudget / 100, currency)}).
            </p>
            <p>Choose how you'd like to resolve this:</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={selectedOption}
          onValueChange={setSelectedOption}
          className="gap-4"
        >
          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="categories" id="categories" />
            <Label htmlFor="categories" className="font-normal">
              <span className="font-medium">Add/Remove Categories</span>
              <p className="text-sm text-muted-foreground">
                {checkResult.type === 'underspend' 
                  ? 'Select more categories to allocate the remaining budget'
                  : 'Remove some categories to reduce the total allocation'}
              </p>
            </Label>
          </div>

          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="allocation" id="allocation" />
            <Label htmlFor="allocation" className="font-normal">
              <span className="font-medium">Adjust Proportionally</span>
              <p className="text-sm text-muted-foreground">
                {checkResult.type === 'underspend'
                  ? 'Increase all category budgets proportionally'
                  : 'Decrease all category budgets proportionally'}
              </p>
            </Label>
          </div>

          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="budget" id="budget" />
            <Label htmlFor="budget" className="font-normal">
              <span className="font-medium">Adjust Target Budget</span>
              <p className="text-sm text-muted-foreground">
                {checkResult.type === 'underspend'
                  ? 'Lower the target budget to match current category allocation'
                  : 'Increase the target budget to match current category allocation'}
              </p>
            </Label>
          </div>

          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="duration" id="duration" />
            <Label htmlFor="duration" className="font-normal">
              <span className="font-medium">Adjust Trip Duration</span>
              <p className="text-sm text-muted-foreground">
                {checkResult.type === 'underspend'
                  ? 'Extend the trip duration to use the full budget'
                  : 'Reduce the trip duration to fit within budget'}
              </p>
            </Label>
          </div>
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setSelectedOption(''); // Reset on cancel
            onClose();
          }}>
            Cancel
          </AlertDialogCancel>
          <Button 
            onClick={handleProceed}
            disabled={!selectedOption}
          >
            Proceed
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Add this function to calculate weighted average confidence
const calculateWeightedConfidence = (
  expenses: TripExpenseCategory[],
  estimates: BudgetAllocationPreviewProps['estimates'],
  overallBudget: number
): number => {
  if (!estimates) return 0;

  const totalBudget = expenses.reduce((sum, expense) => {
    const absoluteValue = (parseFloat(expense.budgetValue.toString()) * overallBudget) / 100;
    return sum + absoluteValue;
  }, 0);

  const weightedConfidence = expenses.reduce((sum, expense) => {
    if (!estimates[expense.key]) return sum;
    const absoluteValue = (parseFloat(expense.budgetValue.toString()) * overallBudget) / 100;
    const confidence = estimates[expense.key][expense.selectedTier || 'medium'].confidence;
    return sum + (confidence * absoluteValue);
  }, 0);

  return totalBudget > 0 ? weightedConfidence / totalBudget : 0;
};

// Add type guard function
const isValidExpensesArray = (expenses: any): expenses is TripExpenseCategory[] => {
  return Array.isArray(expenses) && expenses.every(expense => 
    expense && typeof expense === 'object' && 'key' in expense
  );
};

// Add estimate validation function
function validateEstimate(estimate: any, category?: string): boolean {
  if (!estimate || typeof estimate !== 'object') return false;
  
  const requiredTiers = ['budget', 'medium', 'premium'];
  const requiredFields = ['min', 'max', 'average', 'confidence', 'source'];
  
  // For flight category, ensure we have non-zero values
  if (category === 'flight') {
    return requiredTiers.every(tier => {
      const tierData = estimate[tier];
      if (!tierData || typeof tierData !== 'object') return false;
      return requiredFields.every(field => {
        const value = tierData[field];
        if (field === 'source') return typeof value === 'string';
        if (field === 'confidence') return typeof value === 'number' && value >= 0 && value <= 1;
        // For flight costs, ensure values are non-zero
        if (['min', 'max', 'average'].includes(field)) {
          return typeof value === 'number' && !isNaN(value) && value > 0;
        }
        return typeof value === 'number' && !isNaN(value);
      });
    });
  }
  
  // For other categories
  return requiredTiers.every(tier => {
    const tierData = estimate[tier];
    if (!tierData || typeof tierData !== 'object') return false;
    return requiredFields.every(field => {
      const value = tierData[field];
      if (field === 'source') return typeof value === 'string';
      if (field === 'confidence') return typeof value === 'number' && value >= 0 && value <= 1;
      return typeof value === 'number' && !isNaN(value);
    });
  });
}

// Update the EstimatesSection component to handle loading states
interface EstimatesSectionProps {
  expense: ExpenseData;
  estimates: CategoryEstimates | null;
  onRefresh: (key: string) => void;
  onTierChange: (tier: string, budgetValue: number) => void;
  currency: string;
  isLoading: boolean;
  loadingCategories: Record<string, boolean>;
  overallBudget: number;
  country: string;
  tripId: string;
}

const EstimatesSection = ({ 
  expense,
  estimates,
  onRefresh,
  onTierChange,
  currency,
  isLoading,
  loadingCategories,
  overallBudget,
  country,
  tripId
}: EstimatesSectionProps) => {
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  if (isLoading) {
    return <EstimatesLoadingState />;
  }

  if (!estimates) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-muted/10">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">No estimates available</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRefresh(expense.key)}
            disabled={loadingCategories[expense.key]}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Get Estimates
          </Button>
        </div>
      </div>
    );
  }

  const tiers = ['budget', 'medium', 'premium'] as const;
  const selectedTier = expense.selectedTier || 'budget';

  const handleTierSelect = (tier: string) => {
    const estimate = estimates[tier];
    if (!estimate) return;

    const estimatedValue = estimate.average || 0;
    const budgetValue = (estimatedValue / overallBudget) * 100;

    console.log(`[Budget Preview] Tier selected for ${expense.key}:`, {
      tier,
      estimatedValue,
      budgetValue
    });

    if (estimatedValue > 0) {
      onTierChange(tier, budgetValue);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Price tier tabs */}
      <div className="grid grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const estimate = estimates[tier];
          if (!estimate) return null;

          const estimatedValue = estimate.average || 0;

          return (
            <Button
              key={tier}
              variant={selectedTier === tier ? "default" : "outline"}
              className="w-full"
              onClick={() => handleTierSelect(tier)}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="font-medium capitalize">{tier}</span>
                <span className="text-sm">
                  {formatCurrency(estimatedValue, currency)}
                </span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Selected tier details */}
      {selectedTier && estimates[selectedTier] && (
        <div className="space-y-4">
          {/* Price range and confidence */}
          <div className="space-y-2 p-3 bg-muted/10 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Price Range:</span>
              <span>
                {formatCurrency(estimates[selectedTier].min || 0, currency)} - {formatCurrency(estimates[selectedTier].max || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Confidence Level:</span>
              <span>{((estimates[selectedTier].confidence || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {getUnitLabel(expense.key)}
            </div>
          </div>

          {/* Reference button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowReferenceModal(true)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Reference Options
          </Button>
        </div>
      )}

      {/* Reference Modal */}
      {showReferenceModal && (
        <ReferenceModal
          open={showReferenceModal}
          onClose={() => setShowReferenceModal(false)}
          category={expense.key}
          estimates={estimates}
          selectedTier={selectedTier}
          currency={currency}
          country={country}
          tripId={tripId}
          onSelect={(variant) => {
            if (variant.price) {
              const budgetValue = (variant.price / overallBudget) * 100;
              onTierChange(selectedTier, budgetValue);
            }
            setShowReferenceModal(false);
          }}
        />
      )}
    </div>
  );
};

export const BudgetAllocationPreview = forwardRef<
  HTMLDivElement,
  BudgetAllocationPreviewProps
>((props, ref) => {
  const { toast } = useToast();
  const [budgetAlert, setBudgetAlert] = useState<BudgetAlert>({
    show: false,
    message: '',
    totalPercentage: 0,
    mode: 'none'
  });

  // Add state for persisted categories
  const [persistedCategories, setPersistedCategories] = useState<string[]>([]);

  // Initialize persisted categories when component mounts or when props.selectedCategories changes
  useEffect(() => {
    if (props.selectedCategories?.length > 0) {
      setPersistedCategories(props.selectedCategories);
      console.log('Persisting categories:', props.selectedCategories);
    }
  }, [props.selectedCategories]);

  // Use persisted categories as fallback
  const effectiveCategories = props.selectedCategories?.length > 0 
    ? props.selectedCategories 
    : persistedCategories;

  const [activeCategory, setActiveCategory] = useState<string | null>(
    effectiveCategories[0] || null
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [showManualAdjustment, setShowManualAdjustment] = useState(false);
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});
  const [localExpenses, setLocalExpenses] = useState<ExpenseData[]>(props.expenses);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});
  const [partialEstimates, setPartialEstimates] = useState<Record<string, CategoryEstimate | null>>({});
  const [referenceModal, setReferenceModal] = useState<{
    open: boolean;
    category: string;
    selectedTier: string;
  } | null>(null);

  // Move saveEstimates inside component
  const saveEstimates = async (estimates: Record<string, CategoryEstimate>) => {
    try {
      console.log('[Budget Preview] Saving estimates');
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tripId: props.tripId, 
          estimates 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Budget Preview] Error saving estimates:', errorData);
        throw new Error(errorData.error || `Failed to save estimates: ${response.status}`);
      }

      console.log('[Budget Preview] Successfully saved estimates');
    } catch (error) {
      console.error('[Budget Preview] Error saving estimates:', error);
      toast({
        title: "Warning",
        description: "Estimates were loaded but couldn't be saved for future use",
        variant: "warning"
      });
    }
  };

  // Update local expenses when props change
  useEffect(() => {
    setLocalExpenses(props.expenses);
  }, [props.expenses]);

  // Calculate budget stats
  const budgetStats = useMemo<BudgetStats>(() => {
    const totalAllocation = localExpenses.reduce((sum: number, expense: ExpenseData) => {
      if (!expense) return sum;
      const budgetValue = typeof expense.budgetValue === 'number' ? expense.budgetValue : 0;
      return sum + budgetValue;
    }, 0);

    const allocations = localExpenses.map((expense: ExpenseData) => {
      if (!expense) {
        return {
          key: '',
          name: '',
          value: 0,
          color: '#ccc'
        };
      }

      const budgetValue = typeof expense.budgetValue === 'number' ? expense.budgetValue : 0;
      return {
        key: expense.key,
        name: expense.name,
        value: budgetValue,
        color: categoryColors[expense.key as keyof typeof categoryColors] || '#ccc'
      };
    });

    const totalAmount = (totalAllocation * props.overallBudget) / 100;

    return {
      totalAllocation,
      allocations,
      isValid: totalAllocation <= 100,
      allocated: {
        percentage: totalAllocation,
        amount: totalAmount
      }
    };
  }, [localExpenses, props.overallBudget]);

  // Handle expense updates
  const handleExpenseUpdate = (indexOrKey: number | string, updateOrExpenses: Partial<ExpenseData> | ExpenseData[]) => {
    if (Array.isArray(updateOrExpenses)) {
      // Handle full array update
      if (props.onExpensesChange) {
        props.onExpensesChange(updateOrExpenses);
      }
    } else {
      // Handle single expense update
      const newExpenses = [...props.expenses];
      const index = typeof indexOrKey === 'string' 
        ? newExpenses.findIndex(e => e.key === indexOrKey)
        : indexOrKey;
        
      if (index !== -1) {
        newExpenses[index] = {
          ...newExpenses[index],
          ...updateOrExpenses
        };
        if (props.onExpensesChange) {
          props.onExpensesChange(newExpenses);
        }
      }
    }
  };

  // Add helper function to normalize budget values
  const normalizeBudgetValues = (expenses: ExpenseData[]): ExpenseData[] => {
    const totalAllocation = expenses.reduce((sum, expense) => {
      const budgetValue = typeof expense.budgetValue === 'number' ? expense.budgetValue : 0;
      return sum + budgetValue;
    }, 0);

    if (totalAllocation <= 100) {
      return expenses;
    }

    // If total exceeds 100%, normalize all values proportionally
    const normalizationFactor = 100 / totalAllocation;
    return expenses.map(expense => ({
      ...expense,
      budgetValue: typeof expense.budgetValue === 'number' ? 
        Number((expense.budgetValue * normalizationFactor).toFixed(1)) : 0
    }));
  };

  // Add validation and logging for expenses prop
  const safeExpenses = useMemo(() => {
    const validExpenses = isValidExpensesArray(props.expenses) ? props.expenses : [];
    return validExpenses;
  }, [props.expenses]);

  // Update handleValueChange to use the new handleExpenseUpdate
  const handleValueChange = (value: string, expense: TripExpenseCategory) => {
    if (value === '') {
      handleExpenseUpdate(expense.key, { budgetValue: 0 });
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      handleExpenseUpdate(expense.key, { budgetValue: numValue });
    }
  };

  // Update the totalAllocated calculation
  const totalAllocated = useMemo(() => {
    if (!isValidExpensesArray(safeExpenses)) {
      return 0;
    }

    return safeExpenses
      .filter(expense => effectiveCategories.includes(expense.key))
      .reduce((sum, expense) => {
        const budgetValue = typeof expense.budgetValue === 'number' ? expense.budgetValue : 0;
        return sum + budgetValue;
      }, 0);
  }, [safeExpenses, effectiveCategories]);

  const adjustBudgetAutomatically = () => {
    const selectedExpenses = props.expenses.filter(e => effectiveCategories.includes(e.key));
    const adjustmentFactor = 100 / totalAllocated;

    selectedExpenses.forEach(expense => {
      const newValue = expense.budgetValue * adjustmentFactor;
      props.onExpensesChange(expense.key, { budgetValue: newValue });
    });

    setBudgetAlert({ show: false, message: '', totalPercentage: 100, mode: 'none' });
  };

  // Update the chartData calculation
  const chartData = useMemo(() => {
    const allocatedData = props.expenses
      .filter(expense => effectiveCategories.includes(expense.key))
      .map(expense => {
        const budgetValue = parseFloat(expense.budgetValue?.toString() || '0');
        const cost = parseFloat(expense.cost?.toString() || '0');
        
        console.log(`[Budget Preview] Chart data for ${expense.key}:`, {
          budgetValue,
          cost,
          selectedTier: expense.selectedTier
        });
        
        return {
          name: expense.name,
          value: budgetValue,
          cost: cost,
          color: categoryColors[expense.key as keyof typeof categoryColors] || '#E5E7EB',
          expense
        };
      })
      .filter(item => item.value > 0); // Only include items with non-zero values

    const totalAllocated = allocatedData.reduce((sum, item) => sum + item.value, 0);
    
    console.log('[Budget Preview] Chart data summary:', {
      totalAllocated,
      itemCount: allocatedData.length,
      items: allocatedData.map(item => ({
        name: item.name,
        value: item.value,
        cost: item.cost
      }))
    });
    
    return totalAllocated < 100 
      ? [...allocatedData, { 
          name: 'Unallocated', 
          value: 100 - totalAllocated,
          cost: 0,
          color: '#E5E7EB'
        }]
      : allocatedData;
  }, [props.expenses, effectiveCategories]);

  const getCurrencySymbol = (currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(0).replace(/\d/g, '').trim();
  };

  const handlePercentageChange = (key: string, percentage: string) => {
    const parsedPercentage = parseFloat(percentage);
    if (isNaN(parsedPercentage)) return;
    
    const absoluteValue = (parsedPercentage / 100) * props.overallBudget;
    
    const expenseIndex = props.expenses.findIndex(e => e.key === key);
    if (expenseIndex === -1) return;

    handleExpenseUpdate(expenseIndex, {
      budgetType: 'percentage',
      budgetValue: parsedPercentage,
      cost: absoluteValue
    });
  };

  const handleAbsoluteChange = (key: string, absoluteValue: string) => {
    const absolute = parseFloat(absoluteValue);
    if (isNaN(absolute)) return;
    
    const percentage = (absolute / props.overallBudget) * 100;
    
    const expenseIndex = props.expenses.findIndex(e => e.key === key);
    if (expenseIndex === -1) return;

    handleExpenseUpdate(expenseIndex, {
      budgetType: 'percentage',
      budgetValue: percentage,
      cost: absolute
    });
  };

  // Helper function to safely parse numbers
  const parseNumber = (value: any, defaultValue: number = 0): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || defaultValue;
    return defaultValue;
  };

  // Helper function to safely format numbers
  const formatNumber = (value: any, decimals: number = 1): string => {
    const number = parseNumber(value);
    return number.toFixed(decimals);
  };

  // Add this state to track if estimates have been applied
  const [hasAppliedEstimates, setHasAppliedEstimates] = useState(false);

  // Update the useEffect for applying estimates
  useEffect(() => {
    if (!hasAppliedEstimates && props.estimates && Object.keys(props.estimates).length > 0) {
      console.log('[Budget Preview] Applying initial estimates');
      const updatedExpenses = props.expenses.map(expense => {
        if (props.estimates?.[expense.key]?.budget) {
          const budgetEstimate = props.estimates[expense.key].budget;
          const estimatedValue = budgetEstimate.average || 0;
          return {
            ...expense,
            selectedTier: 'budget',
            budgetValue: ((estimatedValue / props.overallBudget) * 100).toFixed(1)
          };
        }
        return expense;
      });

      setHasAppliedEstimates(true);
      if (props.onExpenseUpdate) {
        props.onExpenseUpdate(updatedExpenses);
      }
    }
  }, [props.estimates, hasAppliedEstimates]);

  // Update handleTierChange to prevent recursive updates
  const handleTierChange = useCallback((expenseKey: string, tier: string, budgetValue?: number) => {
    console.log(`[Budget Preview] Handling tier change for ${expenseKey}:`, {
      tier,
      budgetValue
    });

    const expenseIndex = props.expenses.findIndex(e => e.key === expenseKey);
    if (expenseIndex === -1) {
      console.warn(`[Budget Preview] Could not find expense with key: ${expenseKey}`);
      return;
    }

    const estimate = props.estimates?.[expenseKey.toLowerCase()]?.[tier];
    if (!estimate?.average) {
      console.warn(`[Budget Preview] No estimate found for ${expenseKey} tier ${tier}`);
      return;
    }

    const estimatedValue = estimate.average;
    const newBudgetValue = budgetValue || (estimatedValue / props.overallBudget) * 100;

    console.log(`[Budget Preview] Updating expense ${expenseKey}:`, {
      estimatedValue,
      newBudgetValue,
      tier
    });

    const updatedExpense = {
      ...props.expenses[expenseIndex],
      selectedTier: tier,
      cost: estimatedValue,
      budgetValue: newBudgetValue,
      isManuallySet: !!budgetValue
    };

    // Update parent state
    if (props.onExpenseUpdate) {
      const updatedExpenses = [...props.expenses];
      updatedExpenses[expenseIndex] = updatedExpense;
      props.onExpenseUpdate(updatedExpenses);
    }

    // Update local state
    setLocalExpenses(prev => {
      const updated = [...prev];
      updated[expenseIndex] = updatedExpense;
      return updated;
    });
  }, [props.expenses, props.estimates, props.overallBudget, props.onExpenseUpdate]);

  const handleNextCategory = () => {
    const currentIndex = effectiveCategories.indexOf(activeCategory || '');
    if (currentIndex < effectiveCategories.length - 1) {
      setActiveCategory(effectiveCategories[currentIndex + 1]);
      // Smooth scroll to the next category
      document.getElementById(`category-${effectiveCategories[currentIndex + 1]}`)?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handlePreviousCategory = () => {
    const currentIndex = effectiveCategories.indexOf(activeCategory || '');
    if (currentIndex > 0) {
      setActiveCategory(effectiveCategories[currentIndex - 1]);
      // Smooth scroll to the previous category
      document.getElementById(`category-${effectiveCategories[currentIndex - 1]}`)?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Update the handleNext function
  const handleNext = () => {
    const budgetCheck = checkBudgetAllocation(props.expenses, effectiveCategories);
    if (Math.abs(budgetCheck.totalAllocated - 100) <= 0.1) {
      props.onNext();
    } else {
      setShowBudgetAlert(true);
    }
  };

  // Update the handleAdjustBudget function with detailed logging
  const handleAdjustBudget = async () => {
    const budgetCheck = checkBudgetAllocation(props.expenses, effectiveCategories);
    
    // Calculate new budget based on current allocation
    const currentAllocatedAmount = props.expenses
      .filter(exp => effectiveCategories.includes(exp.key))
      .reduce((sum, exp) => {
        const percentage = parseFloat(exp.budgetValue?.toString() || '0');
        return sum + ((percentage * props.overallBudget) / 100);
      }, 0);

    const newTargetBudget = Math.ceil(currentAllocatedAmount);

    // Prepare request payload
    const payload = {
      tripId: props.tripId,
      budget: newTargetBudget,
      expenses: effectiveCategories.map(key => {
        const expense = props.expenses.find(e => e.key === key);
        return {
          key,
          budgetValue: parseFloat(expense?.budgetValue?.toString() || '0'),
          selectedTier: expense?.selectedTier || 'medium'
        };
      })
    };

    try {
      // Update server
      const response = await fetch('/api/trip-plans/budget', {
        method: 'PATCH', // Changed to PATCH
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.message || 'Failed to save budget adjustment');
      }

      const result = await response.json();
      console.log('Budget adjustment successful:', result);

      // Update local state
      props.onAdjustBudget(newTargetBudget);
      setShowBudgetAlert(false);

      toast({
        title: "Budget Updated",
        description: `Budget adjusted to ${formatCurrency(newTargetBudget, props.currency)}`,
      });
    } catch (error) {
      console.error('Error saving budget adjustment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update budget",
        variant: "destructive"
      });
    }
  };

  // Update handleAdjustAllocation to use the new handleExpenseUpdate
  const handleAdjustAllocation = async () => {
    const budgetCheck = checkBudgetAllocation(props.expenses, effectiveCategories);
    const adjustmentFactor = 100 / budgetCheck.totalAllocated;
    
    try {
      const updatedExpenses = props.expenses.map(expense => {
        if (!effectiveCategories.includes(expense.key)) return expense;
        const newValue = parseFloat(expense.budgetValue.toString()) * adjustmentFactor;
        return {
          ...expense,
          budgetValue: newValue
        };
      });
      
      handleExpenseUpdate(0, updatedExpenses);
      
      toast({
        title: "Budget Adjusted",
        description: "Category allocations have been adjusted proportionally."
      });
    } catch (error) {
      console.error('Error adjusting allocations:', error);
      throw error;
    }
  };

  const handleAdjustDuration = async () => {
    const budgetCheck = checkBudgetAllocation(props.expenses, effectiveCategories);
    const currentDailyBudget = props.overallBudget / props.numberOfDays;
    const newNumberOfDays = Math.round(props.overallBudget / (currentDailyBudget * (100 / budgetCheck.totalAllocated)));
    
    try {
      await props.onAdjustDuration(newNumberOfDays);
      
      toast({
        title: "Duration Adjusted",
        description: `Trip duration updated to ${newNumberOfDays} days.`
      });
    } catch (error) {
      console.error('Error adjusting duration:', error);
      throw error;
    }
  };

  // Use useImperativeHandle to expose the function
  React.useImperativeHandle(ref, () => ({
    showBudgetAlert: () => {
      const budgetCheck = checkBudgetAllocation(props.expenses, effectiveCategories);
      setShowBudgetAlert(true);
    }
  }));

  // Update the reference link click handler
  const handleReferenceClick = (e: React.MouseEvent, category: string, tier: string) => {
    e.preventDefault();
    setReferenceModal({
      open: true,
      category,
      selectedTier: tier
    });
  };

  // Add this debug function to check estimate storage
  const debugEstimateStorage = () => {
    if (props.expenses) {
      props.expenses.forEach(expense => {
        console.log(`Expense ${expense.key}:`, {
          hasEstimates: !!props.estimates?.[expense.key],
          estimateStructure: props.estimates?.[expense.key] ? Object.keys(props.estimates[expense.key]) : null,
          budgetValue: expense.budgetValue,
          selectedTier: expense.selectedTier
        });
      });
    }
  };

  // Use partial estimates in the UI
  const getEstimateForCategory = (category: string) => {
    return partialEstimates[category] || null;
  };

  // Add useEffect to log budget changes
  useEffect(() => {
    const totalAllocation = props.expenses
      .filter(exp => effectiveCategories.includes(exp.key))
      .reduce((sum, exp) => {
        const budgetValue = parseFloat(exp.budgetValue?.toString() || '0');
        const absoluteValue = (budgetValue / 100) * props.overallBudget;
        return sum + absoluteValue;
      }, 0);

    console.log('=== BUDGET ALLOCATION ===', {
      total: formatCurrency(totalAllocation, props.currency),
      byCategory: props.expenses
        .filter(exp => effectiveCategories.includes(exp.key))
        .map(exp => ({
          category: exp.key,
          amount: formatCurrency((parseFloat(exp.budgetValue?.toString() || '0') / 100) * props.overallBudget, props.currency)
        }))
    });
  }, [props.overallBudget, props.expenses, effectiveCategories, props.currency]);

  // Update loadEstimates to handle estimate loading more robustly
  const loadEstimates = async () => {
    if (isLoadingEstimates) return;
    setIsLoadingEstimates(true);
    setEstimateError(null);
    
    try {
      // Check if we already have valid estimates for all categories
      const hasValidEstimates = effectiveCategories.every(category => {
        const estimate = partialEstimates?.[category.toLowerCase()];
        return estimate && validateEstimate(estimate, category);
      });

      if (hasValidEstimates) {
        return;
      }

      // First check if we have stored estimates
      const response = await fetch(`/api/estimates?tripId=${props.tripId}`);
      if (!response.ok) {
        throw new Error('Failed to load saved estimates');
      }
      
      const savedEstimates = await response.json();
      
      // Check historical data for flight estimates
      let mergedEstimates = { ...savedEstimates.estimates };
      
      if (effectiveCategories.includes('flight')) {
        try {
          const historyResponse = await fetch(`/api/estimates/history?category=flight&days=30`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            
            // If we have historical flight data and current flight estimates are missing or zero
            if (historyData.estimates?.length > 0 && 
                (!mergedEstimates.flight || 
                 !mergedEstimates.flight.budget?.average || 
                 !mergedEstimates.flight.medium?.average || 
                 !mergedEstimates.flight.premium?.average)) {
              
              // Get the most recent historical estimate
              const latestFlightEstimate = historyData.estimates[0];
              
              mergedEstimates.flight = {
                budget: {
                  min: latestFlightEstimate.minCost,
                  max: latestFlightEstimate.maxCost,
                  average: latestFlightEstimate.avgCost,
                  confidence: latestFlightEstimate.confidence,
                  source: latestFlightEstimate.source,
                  references: []
                },
                medium: {
                  min: latestFlightEstimate.minCost * 1.5,
                  max: latestFlightEstimate.maxCost * 1.5,
                  average: latestFlightEstimate.avgCost * 1.5,
                  confidence: latestFlightEstimate.confidence,
                  source: latestFlightEstimate.source,
                  references: []
                },
                premium: {
                  min: latestFlightEstimate.minCost * 2.5,
                  max: latestFlightEstimate.maxCost * 2.5,
                  average: latestFlightEstimate.avgCost * 2.5,
                  confidence: latestFlightEstimate.confidence,
                  source: latestFlightEstimate.source,
                  references: []
                }
              };
            }
          }
        } catch (error) {
          console.error('Error fetching flight history:', error);
        }
      }

      // Validate merged estimates
      const hasValidMergedEstimates = mergedEstimates && 
        Object.keys(mergedEstimates).length > 0 &&
        effectiveCategories.every(category => {
          const estimate = mergedEstimates[category.toLowerCase()];
          return estimate && validateEstimate(estimate, category);
        });

      if (hasValidMergedEstimates) {
        console.log('Using merged estimates:', mergedEstimates);
        setPartialEstimates(mergedEstimates);
        if (props.onEstimatesUpdate) {
          props.onEstimatesUpdate(mergedEstimates);
        }
        return;
      }

      // If no valid saved estimates, fetch new ones
      await fetchPerplexityEstimates();
    } catch (error) {
      console.error('Error loading estimates:', error);
      setEstimateError(error instanceof Error ? error.message : 'Failed to load estimates');
    } finally {
      setIsLoadingEstimates(false);
    }
  };

  // Update fetchPerplexityEstimates function
  const fetchPerplexityEstimates = async () => {
    if (isLoadingEstimates) return;
    
    try {
      console.log('Fetching new estimates from Perplexity API');
      
      // Safely handle date conversion
      const startDate = props.startDate ? 
        (typeof props.startDate === 'string' ? props.startDate : new Date(props.startDate).toISOString()) 
        : new Date().toISOString();
        
      const endDate = props.endDate ? 
        (typeof props.endDate === 'string' ? props.endDate : new Date(props.endDate).toISOString()) 
        : new Date().toISOString();

      const response = await fetch('/api/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: props.tripId,
          country: props.country,
          startDate,
          endDate,
          travelers: props.travelers,
          currency: props.currency,
          selectedCategories: effectiveCategories,
          departureLocation: props.departureLocation
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch estimates: ${response.status}`);
      }

      const newEstimates = await response.json();
      console.log('Received new estimates:', newEstimates);

      // Validate estimates structure
      const hasValidEstimates = effectiveCategories.every(category => {
        const estimate = newEstimates[category.toLowerCase()];
        return estimate && validateEstimate(estimate, category);
      });

      if (!hasValidEstimates) {
        throw new Error('Invalid estimates received from the API');
      }

      // Update state with new estimates
      setPartialEstimates(newEstimates);
      
      // Update parent component
      if (props.onEstimatesUpdate) {
        props.onEstimatesUpdate(newEstimates);
      }

      // Save the estimates
      await saveEstimates(newEstimates);

      toast({
        title: "Success",
        description: "Successfully loaded new estimates",
      });

    } catch (error) {
      console.error('Error fetching estimates:', error);
      setEstimateError(error instanceof Error ? error.message : 'Failed to fetch estimates');
      throw error;
    }
  };

  // Update useEffect to prevent unnecessary estimate fetches
  useEffect(() => {
    if (!props.tripId || !effectiveCategories?.length) {
      return;
    }

    const hasChangedCategories = !partialEstimates || 
      effectiveCategories.some(category => {
        const estimate = partialEstimates[category.toLowerCase()];
        return !estimate || !validateEstimate(estimate, category);
      });

    if (hasChangedCategories) {
      debugEstimateStorage();
      loadEstimates();
    }
  }, [props.tripId, effectiveCategories]);

  // Update the handleInputChange function
  const handleInputChange = (expenseKey: string, value: string, type: 'amount' | 'percent') => {
    console.log(`[Budget Preview] Input change for ${expenseKey}:`, { type, value });
    
    // Store the raw input value in tempInputs
    setTempInputs(prev => ({
      ...prev,
      [`${expenseKey}-${type}`]: value
    }));
  };

  // Update the handleInputBlur function
  const handleInputBlur = (index: number, expense: ExpenseData, type: 'amount' | 'percent') => {
    const inputKey = `${expense.key}-${type}`;
    const inputValue = tempInputs[inputKey];
    
    if (inputValue === undefined) return;
    
    console.log(`[Budget Preview] Input blur for ${expense.key}:`, { type, inputValue });
    
    let newBudgetValue: number;
    let newCost: number;
    
    if (type === 'percent') {
      // For percentage input, directly use the value (capped at 100)
      newBudgetValue = Math.min(Math.max(parseFloat(inputValue) || 0, 0), 100);
      newCost = (newBudgetValue * props.overallBudget) / 100;
    } else {
      // For amount input, convert to percentage based on overall budget
      newCost = parseFloat(inputValue) || 0;
      newBudgetValue = Math.min((newCost / props.overallBudget) * 100, 100);
    }
    
    console.log(`[Budget Preview] Updating expense ${expense.key}:`, {
      newBudgetValue,
      newCost,
      type,
      originalValue: inputValue
    });
    
    // Create updated expense object
    const updatedExpense = {
      ...expense,
      budgetValue: newBudgetValue,
      cost: newCost,
      isManuallySet: true
    };
    
    // Update parent state
    if (props.onExpenseUpdate) {
      const updatedExpenses = [...props.expenses];
      updatedExpenses[index] = updatedExpense;
      props.onExpenseUpdate(updatedExpenses);
    }
    
    // Update local state
    setLocalExpenses(prev => {
      const updated = [...prev];
      updated[index] = updatedExpense;
      return updated;
    });
    
    // Clear the temporary input after a short delay to allow the new value to be displayed
    setTimeout(() => {
      setTempInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[inputKey];
        return newInputs;
      });
    }, 100);
  };

  const ManualAdjustmentDialog = () => {
    return (
      <AlertDialog open={showManualAdjustment} onOpenChange={setShowManualAdjustment}>
        <AlertDialogContent className="max-w-3xl">
          {/* ... dialog content ... */}
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Update the handleRefresh function to force a new estimate fetch
  const handleRefresh = async () => {
    if (isLoadingEstimates) return;
    
    try {
      setIsLoadingEstimates(true);
      setPartialEstimates({}); // Clear existing estimates
      console.log('[Budget Preview] Force refreshing all estimates');
      
      // Force new estimates fetch from Perplexity
      await fetchPerplexityEstimates();
      
      // After getting new estimates, apply budget tier by default
      const updatedExpenses = props.expenses.map(expense => {
        if (props.estimates?.[expense.key]?.budget) {
          const budgetEstimate = props.estimates[expense.key].budget;
          const estimatedValue = budgetEstimate.average;
          return {
            ...expense,
            selectedTier: 'budget',
            cost: estimatedValue,
            budgetValue: (estimatedValue / props.overallBudget) * 100
          };
        }
        return expense;
      });

      if (props.onExpensesChange) {
        props.onExpensesChange(updatedExpenses);
      }

      toast({
        title: "Success",
        description: "Successfully refreshed all estimates",
      });
    } catch (error) {
      console.error('[Budget Preview] Error refreshing estimates:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh estimates",
        variant: "destructive"
      });
    } finally {
      setIsLoadingEstimates(false);
    }
  };

  // Add handleSingleCategoryRefresh function
  const handleSingleCategoryRefresh = async (categoryKey: string) => {
    if (loadingCategories[categoryKey] || !props.tripId) return;

    setLoadingCategories(prev => ({ ...prev, [categoryKey]: true }));
    
    try {
      console.log(`[Budget Preview] Refreshing estimates for category: ${categoryKey}`);
      
      const response = await fetch('/api/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: props.tripId,
          country: props.country,
          startDate: props.startDate,
          endDate: props.endDate,
          travelers: props.travelers,
          currency: props.currency,
          selectedCategories: [categoryKey], // Send only the selected category
          departureLocation: categoryKey === 'flight' ? props.departureLocation : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to refresh estimates: ${response.status}`);
      }

      // Validate the estimate
      const estimate = data[categoryKey.toLowerCase()];
      if (!estimate || !validateEstimate(estimate, categoryKey)) {
        throw new Error(`Invalid estimate received for ${categoryKey}`);
      }

      // Update partial estimates
      setPartialEstimates(prev => ({
        ...prev,
        [categoryKey.toLowerCase()]: estimate
      }));

      toast({
        title: "Success",
        description: `Updated estimates for ${categoryKey}`,
      });
      
    } catch (error) {
      console.error(`[Budget Preview] Error refreshing ${categoryKey} estimates:`, error);
      
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : 'Failed to refresh estimates. Please try again later.',
        variant: "destructive"
      });
    } finally {
      setLoadingCategories(prev => ({ ...prev, [categoryKey]: false }));
    }
  };

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <main className="flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-2 gap-4 p-3 h-full">
            <Card className="flex flex-col h-full">
              <CardHeader className="p-3">
                <CardTitle>Budget Allocation Setup</CardTitle>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Categories:</span>
                    <span>{effectiveCategories.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allocated Budget:</span>
                    <span>{formatCurrency(budgetStats.totalAllocation * props.overallBudget / 100, props.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Confidence:</span>
                    <span>
                      {props.estimates ? 
                        `${(Object.values(props.estimates)
                          .filter(e => e)
                          .reduce((sum, e) => sum + (e?.medium?.confidence || 0), 0) / 
                          Object.values(props.estimates).filter(e => e).length * 100
                        ).toFixed(1)}%` : 
                        'Calculating...'
                      }
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3 min-h-0 overflow-auto">
                <div className="h-full overflow-y-auto pr-1">
                  <Accordion 
                    type="single" 
                    collapsible 
                    className="space-y-2"
                  >
                    {localExpenses
                      .filter(expense => effectiveCategories.includes(expense.key))
                      .map((expense, index) => (
                        <AccordionItem 
                          key={expense.key} 
                          value={expense.key}
                          className="border rounded-lg px-4 py-1"
                        >
                          <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: categoryColors[expense.key as keyof typeof categoryColors] || '#E5E7EB' }}
                                />
                                <span className="font-medium text-sm">
                                  {expense.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mr-6">
                                {(!props.estimates || loadingCategories[expense.key]) ? (
                                  <HeaderLoadingDots />
                                ) : (
                                  <>
                                    <span className="text-sm text-muted-foreground">
                                      {formatCurrency((typeof expense.budgetValue === 'number' ? expense.budgetValue : 0) * props.overallBudget / 100, props.currency)}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                                      {expense.selectedTier || 'medium'}
                                    </span>
                                    {props.estimates && expense.selectedTier && props.estimates[expense.key] && props.estimates[expense.key][expense.selectedTier] ? (
                                      <span className="text-xs text-muted-foreground">
                                        {(props.estimates[expense.key][expense.selectedTier].confidence * 100).toFixed(0)}% confidence
                                      </span>
                                    ) : null}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSingleCategoryRefresh(expense.key);
                                      }}
                                      disabled={loadingCategories[expense.key] || isLoadingEstimates}
                                    >
                                      <RefreshCw className={cn(
                                        "h-3 w-3",
                                        (loadingCategories[expense.key] || isLoadingEstimates) && "animate-spin"
                                      )} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {/* Pre-booked checkbox */}
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`prebooked-${expense.key}`}
                                  checked={expense.preBooked}
                                  onCheckedChange={(checked) => {
                                    handleExpenseUpdate(index, {
                                      preBooked: checked === true
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Label htmlFor={`prebooked-${expense.key}`} onClick={(e) => e.stopPropagation()}>
                                  Pre-booked
                                </Label>
                              </div>

                              {/* Budget input fields */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Percentage</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      className="w-24"
                                      type="text"
                                      value={tempInputs[`${expense.key}-percent`] !== undefined ? 
                                        tempInputs[`${expense.key}-percent`] : 
                                        (typeof expense.budgetValue === 'number' ? expense.budgetValue.toFixed(1) : '0')}
                                      onChange={(e) => handleInputChange(expense.key, e.target.value, 'percent')}
                                      onBlur={() => handleInputBlur(index, expense, 'percent')}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span>%</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Amount</Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                      {getCurrencySymbol(props.currency)}
                                    </span>
                                    <Input
                                      className="pl-8"
                                      type="text"
                                      value={tempInputs[`${expense.key}-amount`] !== undefined ? 
                                        tempInputs[`${expense.key}-amount`] : 
                                        ((typeof expense.budgetValue === 'number' ? expense.budgetValue : 0) * props.overallBudget / 100).toFixed(2)}
                                      onChange={(e) => handleInputChange(expense.key, e.target.value, 'amount')}
                                      onBlur={() => handleInputBlur(index, expense, 'amount')}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <Progress 
                                  value={expense.budgetValue} 
                                  max={100} 
                                  className="h-2"
                                />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>
                                    {formatCurrency((typeof expense.budgetValue === 'number' ? expense.budgetValue : 0) * props.overallBudget / 100, props.currency)}
                                  </span>
                                  <span>{typeof expense.budgetValue === 'number' ? expense.budgetValue.toFixed(1) : '0'}%</span>
                                </div>
                              </div>

                              {/* Estimates loading or display */}
                              <EstimatesSection
                                key={expense.key}
                                expense={expense}
                                estimates={partialEstimates?.[expense.key]}
                                onRefresh={handleSingleCategoryRefresh}
                                onTierChange={(tier, budgetValue) => handleTierChange(expense.key, tier, budgetValue)}
                                currency={props.currency}
                                isLoading={loadingCategories[expense.key]}
                                loadingCategories={loadingCategories}
                                overallBudget={props.overallBudget}
                                country={props.country}
                                tripId={props.tripId}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader className="p-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Budget Distribution</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh All Estimates
                    </Button>
                    {estimateError && (
                      <div className="text-sm text-red-500 mt-2">
                        {estimateError}
                      </div>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {/* ... existing description content ... */}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-3 min-h-0">
                <div className="h-[calc(100vh-16rem)] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="85%"
                        animationBegin={0}
                        animationDuration={500}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                          if (value < 5) return null; // Don't show labels for small segments
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          return (
                            <g>
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{
                                  fontSize: '1.2vw',
                                  fontWeight: 500,
                                  textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
                                }}
                              >
                                {`${name.split(' ')[0]}${value > 10 ? ` ${value.toFixed(0)}%` : ''}`}
                              </text>
                            </g>
                          );
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            style={{
                              filter: 'url(#shadow)',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        ))}
                      </Pie>
                      
                      {/* Add drop shadow filter */}
                      <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
                        </filter>
                      </defs>

                      {/* Center text with dynamic sizing and better layout */}
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: '1.2vw',
                          fontFamily: 'system-ui'
                        }}
                      >
                        <tspan 
                          x="50%" 
                          dy="-2.2em" 
                          fill="#6B7280"
                          style={{
                            fontSize: '1.1vw',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Target Budget
                        </tspan>
                        <tspan 
                          x="50%" 
                          dy="1.8em" 
                          fill="#111827"
                          style={{
                            fontSize: '1.4vw',
                            fontWeight: 600,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {formatCurrency(props.overallBudget, props.currency)}
                        </tspan>
                        
                        <tspan 
                          x="50%" 
                          dy="2.5em" 
                          fill="#6B7280"
                          style={{
                            fontSize: '1.1vw',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Allocated
                        </tspan>
                        <tspan 
                          x="50%" 
                          dy="1.8em" 
                          style={{
                            fontSize: '1.4vw',
                            fontWeight: 600,
                            fill: budgetStats.allocated.percentage > 100 ? "#EF4444" : "#10B981",
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {formatCurrency(budgetStats.allocated.amount, props.currency)}
                        </tspan>
                      </text>

                      <Tooltip 
                        content={
                          <CustomTooltip 
                            overallBudget={props.overallBudget} 
                            currency={props.currency}
                          />
                        }
                        animationDuration={200}
                        animationEasing="ease-out"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <BudgetAlertDialog
        open={showBudgetAlert}
        onClose={() => setShowBudgetAlert(false)}
        checkResult={checkBudgetAllocation(props.expenses, effectiveCategories)}
        onAdjustBudget={handleAdjustBudget}
        onAdjustCategories={async () => {
          try {
            await props.onCategoriesChange();
            toast({
              title: "Categories Updated",
              description: "You can now modify your category selection."
            });
          } catch (error) {
            console.error('Error adjusting categories:', error);
            throw error;
          }
        }}
        onAdjustAllocation={handleAdjustAllocation}
        onAdjustDuration={handleAdjustDuration}
        currency={props.currency}
        overallBudget={props.overallBudget}
      />
      {referenceModal && (
        <ReferenceModal
          open={referenceModal.open}
          onClose={() => setReferenceModal(null)}
          category={referenceModal.category}
          estimates={props.estimates}
          selectedTier={referenceModal.selectedTier}
          currency={props.currency}
          country={props.country}
          tripId={props.tripId}
        />
      )}
      <ManualAdjustmentDialog />
    </div>
  )
}) 