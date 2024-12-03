'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { TripExpenseCategory } from "@/types/trip"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useMemo, useEffect } from "react"
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity';
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/currency';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface BudgetAllocationPreviewProps {
  selectedCategories: string[]
  expenses: TripExpenseCategory[]
  currency: string
  overallBudget: number
  onExpenseUpdate: (key: string, updates: Partial<TripExpenseCategory>) => void
  estimates?: {
    [key: string]: {
      min: number;
      max: number;
      average: number;
      confidence: number;
      currency: string;
    }
  } | null;
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

const PriceTierTabs = ({ 
  expense,
  selectedTier,
  onTierChange,
  estimates
}: {
  expense: ExpenseData;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  estimates: any;
}) => {
  return (
    <Tabs
      value={selectedTier}
      onValueChange={onTierChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0">
        {['budget', 'medium', 'premium'].map((tier) => (
          <TabsTrigger
            key={tier}
            value={tier}
            className={cn(
              "data-[state=active]:bg-white",
              "data-[state=active]:border-primary",
              "border-2",
              "rounded-md",
              "capitalize",
              "hover:bg-slate-50",
              selectedTier === tier ? "border-primary" : "border-input",
              "transition-all"
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="font-medium capitalize">{tier}</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(estimates[expense.key][tier].average, expense.currency)}
              </span>
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

const LoadingDots = () => (
  <div className="flex items-center space-x-1 ml-2">
    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></div>
  </div>
);

export function BudgetAllocationPreview({
  selectedCategories,
  expenses,
  currency,
  overallBudget,
  onExpenseUpdate,
  estimates
}: BudgetAllocationPreviewProps) {
  const [budgetAlert, setBudgetAlert] = useState<BudgetAlert>({
    show: false,
    message: '',
    totalPercentage: 0,
    mode: 'none'
  });
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>(() => {
    const savedTiers: Record<string, string> = {};
    expenses.forEach(expense => {
      savedTiers[expense.key] = expense.selectedTier || 'medium';
    });
    return savedTiers;
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(
    selectedCategories[0] || null
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const totalAllocated = expenses
    .filter(expense => selectedCategories.includes(expense.key))
    .reduce((sum, expense) => {
      const defaultExpense = DEFAULT_EXPENSE_CATEGORIES.find(d => d.key === expense.key)
      const defaultPercentage = defaultExpense?.defaultPercentage || 0

      const budgetValue = typeof expense.budgetValue === 'string' 
        ? parseFloat(expense.budgetValue) 
        : (expense.budgetValue ?? defaultPercentage);
        
      if (expense.budgetType === 'percentage') {
        return sum + (budgetValue || 0);
      }

      const cost = typeof expense.cost === 'string' 
        ? parseFloat(expense.cost) 
        : (expense.cost ?? 0);

      return sum + ((cost / (overallBudget || 1)) * 100);
    }, 0);

  const adjustBudgetAutomatically = () => {
    const selectedExpenses = expenses.filter(e => selectedCategories.includes(e.key));
    const adjustmentFactor = 100 / totalAllocated;

    selectedExpenses.forEach(expense => {
      const newValue = expense.budgetValue * adjustmentFactor;
      onExpenseUpdate(expense.key, { budgetValue: newValue });
    });

    setBudgetAlert({ show: false, message: '', totalPercentage: 100, mode: 'none' });
  };

  const handleValueChange = (key: string, value: number, type: 'percentage' | 'absolute') => {
    let newValue: number;
    
    if (type === 'absolute') {
      newValue = (value / (overallBudget || 1)) * 100;
    } else {
      newValue = parseFloat(validatePercentageInput(value.toString()));
    }

    const expense = expenses.find(e => e.key === key);
    const currentValue = expense?.budgetValue ?? 0;

    onExpenseUpdate(key, { budgetValue: newValue });

    const newTotal = totalAllocated + (newValue - currentValue);
    
    if (Math.abs(newTotal - 100) > 0.1) {
      setBudgetAlert({
        show: true,
        message: newTotal > 100 
          ? `Budget is overspent by ${(newTotal - 100).toFixed(1)}%`
          : `Budget is underfunded by ${(100 - newTotal).toFixed(1)}%`,
        totalPercentage: newTotal,
        mode: 'initial'
      });
    }
  };

  const chartData = useMemo(() => {
    const allocatedData = expenses
      .filter(expense => selectedCategories.includes(expense.key))
      .map(expense => ({
        name: expense.name,
        value: typeof expense.budgetValue === 'string' 
          ? parseFloat(expense.budgetValue) 
          : expense.budgetValue,
        color: categoryColors[expense.key as keyof typeof categoryColors]
      }))

    const totalAllocated = allocatedData.reduce((sum, item) => sum + (item.value || 0), 0)
    
    return totalAllocated < 100 
      ? [...allocatedData, { 
          name: 'Unallocated', 
          value: 100 - totalAllocated,
          color: '#E5E7EB'
        }]
      : allocatedData
  }, [expenses, selectedCategories])

  const getCurrencySymbol = (currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(0).replace(/\d/g, '').trim();
  };

  const handlePercentageChange = (key: string, percentageValue: string) => {
    const percentage = parseFloat(percentageValue) || 0;
    const absoluteValue = (percentage / 100) * overallBudget;
    
    onExpenseUpdate(key, {
      budgetType: 'percentage',
      budgetValue: percentage,
      cost: absoluteValue
    });
  };

  const handleAbsoluteChange = (key: string, absoluteValue: string) => {
    const absolute = parseFloat(absoluteValue) || 0;
    const percentage = (absolute / overallBudget) * 100;
    
    onExpenseUpdate(key, {
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

  // Updated LoadingDots component
  const LoadingDots = () => (
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

  // Effect to auto-update values when estimates arrive
  useEffect(() => {
    if (estimates) {
      expenses.forEach(expense => {
        if (estimates[expense.key]) {
          // Default to medium tier for initial estimate
          const mediumEstimate = estimates[expense.key].medium;
          const estimatedValue = mediumEstimate.average;
          const percentage = (estimatedValue / overallBudget) * 100;

          // Update both percentage and absolute values
          handleAbsoluteChange(expense.key, estimatedValue.toString());
          setSelectedTiers(prev => ({
            ...prev,
            [expense.key]: 'medium'
          }));
        }
      });
    }
  }, [estimates]);

  const handleNextCategory = () => {
    const currentIndex = selectedCategories.indexOf(activeCategory || '');
    if (currentIndex < selectedCategories.length - 1) {
      setActiveCategory(selectedCategories[currentIndex + 1]);
      // Smooth scroll to the next category
      document.getElementById(`category-${selectedCategories[currentIndex + 1]}`)?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handlePreviousCategory = () => {
    const currentIndex = selectedCategories.indexOf(activeCategory || '');
    if (currentIndex > 0) {
      setActiveCategory(selectedCategories[currentIndex - 1]);
      // Smooth scroll to the previous category
      document.getElementById(`category-${selectedCategories[currentIndex - 1]}`)?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handleTierChange = (expenseKey: string, tier: string) => {
    setSelectedTiers(prev => ({
      ...prev,
      [expenseKey]: tier
    }));

    // Update expense with new tier and estimates
    onExpenseUpdate(expenseKey, {
      selectedTier: tier,
      estimates: estimates?.[expenseKey] || null,
      // Update budget value based on selected tier
      budgetValue: estimates?.[expenseKey]?.[tier]?.average.toString() || '0'
    });
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-[calc(100vh-16rem)] w-full px-6 mb-16">
      <Card className="h-full w-full">
        <CardContent className="overflow-y-auto max-h-[calc(100vh-20rem)] pt-6">
          <Accordion type="single" collapsible className="space-y-4">
            {expenses
              .filter(expense => selectedCategories.includes(expense.key))
              .map(expense => (
                <AccordionItem 
                  key={expense.key} 
                  value={expense.key}
                  className="border rounded-lg px-4 py-2"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: categoryColors[expense.key] }}
                        />
                        <span className="font-medium">{expense.name}</span>
                        {!estimates && <LoadingDots />}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`prebooked-${expense.key}`}
                            checked={expense.preBooked}
                            onCheckedChange={(checked) => {
                              onExpenseUpdate(expense.key, { preBooked: !!checked });
                            }}
                          />
                          <Label htmlFor={`prebooked-${expense.key}`}>Pre-booked</Label>
                        </div>
                        <Switch
                          checked={true}
                          onCheckedChange={() => {}}
                        />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Percentage</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24"
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={expense.budgetValue}
                            onChange={(e) => onExpenseUpdate(expense.key, { budgetValue: e.target.value })}
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {getCurrencySymbol(currency)}
                          </span>
                          <Input
                            className="pl-8"
                            type="number"
                            min={0}
                            step={0.01}
                            value={(parseFloat(expense.budgetValue) * overallBudget / 100).toFixed(2)}
                            onChange={(e) => {
                              const percentage = ((parseFloat(e.target.value) || 0) / overallBudget * 100).toFixed(1);
                              onExpenseUpdate(expense.key, { budgetValue: percentage });
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mt-6">
                      <Progress 
                        value={parseFloat(expense.budgetValue)} 
                        max={100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {formatCurrency(parseFloat(expense.budgetValue) * overallBudget / 100, currency)}
                        </span>
                        <span>{formatNumber(expense.budgetValue)}%</span>
                      </div>
                    </div>

                    {estimates?.[expense.key] && (
                      <div className="mt-4 space-y-4">
                        <Label>Price Tier</Label>
                        <PriceTierTabs
                          expense={expense}
                          selectedTier={selectedTiers[expense.key] || 'medium'}
                          onTierChange={(tier) => handleTierChange(expense.key, tier)}
                          estimates={estimates}
                        />
                        
                        <div className="text-sm text-muted-foreground space-y-2">
                          <div className="flex justify-between">
                            <span>Estimated range:</span>
                            <span>
                              {formatCurrency(estimates[expense.key][selectedTiers[expense.key] || 'medium'].min)} - 
                              {formatCurrency(estimates[expense.key][selectedTiers[expense.key] || 'medium'].max)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Confidence:</span>
                            <span>
                              {(estimates[expense.key][selectedTiers[expense.key] || 'medium'].confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          {estimates[expense.key][selectedTiers[expense.key] || 'medium'].source && (
                            <div className="pt-2 border-t mt-2">
                              <p className="font-medium mb-1">Sources:</p>
                              <div className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4" />
                                <a 
                                  href={estimates[expense.key][selectedTiers[expense.key] || 'medium'].source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  View Reference Data
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="h-full w-full">
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100vh-20rem)]">
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={140}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={budgetAlert.show}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Budget Allocation Warning</AlertDialogTitle>
            <AlertDialogDescription>{budgetAlert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetAlert(prev => ({ ...prev, mode: 'none' }))}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={adjustBudgetAutomatically}>
              Adjust Automatically
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 