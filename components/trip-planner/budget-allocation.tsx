import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface BudgetAllocationProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  errors?: Record<string, any>;
}

export function BudgetAllocation({
  selectedCategories,
  onCategoryChange,
  errors
}: BudgetAllocationProps) {
  return (
    <div className="space-y-4">
      {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
        <div key={category.key} className="flex items-start space-x-3">
          <Checkbox
            id={category.key}
            checked={selectedCategories.includes(category.key)}
            onCheckedChange={(checked) => {
              if (checked) {
                onCategoryChange([...selectedCategories, category.key]);
              } else {
                onCategoryChange(selectedCategories.filter(c => c !== category.key));
              }
            }}
          />
          <div className="space-y-1">
            <Label
              htmlFor={category.key}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {category.name}
            </Label>
            <p className="text-sm text-muted-foreground">
              Default allocation: {category.defaultPercentage}%
            </p>
          </div>
        </div>
      ))}
      {errors?.selectedCategories && (
        <p className="text-sm text-red-500 mt-2">{errors.selectedCategories}</p>
      )}
    </div>
  );
} 