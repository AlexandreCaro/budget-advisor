import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCategoryContainerClassName } from '@/components/trip-planner/form-validation';

const EXPENSE_CATEGORIES = [
  { name: 'Flights', key: 'flight', defaultPercentage: 30, color: '#FF6B6B' },
  { name: 'Accommodation', key: 'accommodation', defaultPercentage: 30, color: '#4ECDC4' },
  { name: 'Local Transportation', key: 'localTransportation', defaultPercentage: 10, color: '#45B7D1' },
  { name: 'Food & Beverages', key: 'food', defaultPercentage: 15, color: '#96CEB4' },
  { name: 'Cultural Activities', key: 'activities', defaultPercentage: 10, color: '#FFEEAD' },
  { name: 'Shopping', key: 'shopping', defaultPercentage: 5, color: '#D4A5A5' },
  { name: 'Car Rental', key: 'carRental', defaultPercentage: 0, color: '#9A9EAB' }
] as const;

interface BudgetAllocationProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  errors?: Record<string, { error: boolean; message?: string }>;
}

export function BudgetAllocation({
  selectedCategories,
  onCategoryChange,
  errors
}: BudgetAllocationProps) {
  const toggleCategory = (key: string) => {
    if (selectedCategories.includes(key)) {
      onCategoryChange(selectedCategories.filter(c => c !== key));
    } else {
      onCategoryChange([...selectedCategories, key]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === EXPENSE_CATEGORIES.length) {
      onCategoryChange([]);
    } else {
      onCategoryChange(EXPENSE_CATEGORIES.map(c => c.key));
    }
  };

  return (
    <Card className={getCategoryContainerClassName(errors?.selectedCategories)}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Choose what to track</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleSelectAll}
            className="shrink-0"
          >
            {selectedCategories.length === EXPENSE_CATEGORIES.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPENSE_CATEGORIES.map(category => (
            <Button
              key={category.key}
              variant="outline"
              className={cn(
                "h-auto p-4 justify-start gap-4",
                selectedCategories.includes(category.key) && "border-primary",
                errors?.selectedCategories?.error && "border-red-500 hover:border-red-500"
              )}
              onClick={() => toggleCategory(category.key)}
            >
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: category.color }}
              />
              <div className="flex flex-col items-start">
                <span className="font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  Default: {category.defaultPercentage}%
                </span>
              </div>
            </Button>
          ))}
        </div>
        {errors?.selectedCategories?.error && (
          <p className="mt-2 text-sm text-red-500">{errors.selectedCategories.message}</p>
        )}
      </CardContent>
    </Card>
  );
} 