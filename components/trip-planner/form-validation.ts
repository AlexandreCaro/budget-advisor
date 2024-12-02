export type ValidationErrors = {
  name?: string;
  country?: string;
  dates?: string;
  budget?: string;
  categories?: string;
}

export const validateStep = (
  step: number, 
  formData: any, 
  setErrors: (errors: ValidationErrors) => void
): boolean => {
  const newErrors: ValidationErrors = {}

  switch (step) {
    case 1:
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required'
      }
      break
    case 2:
      if (!formData.country) {
        newErrors.country = 'Country is required'
      }
      if (!formData.startDate || !formData.endDate) {
        newErrors.dates = 'Dates are required'
      }
      if (!formData.overallBudget || parseFloat(formData.overallBudget) <= 0) {
        newErrors.budget = 'Valid budget is required'
        return false // Stop here if budget is invalid
      }
      break
    case 3:
      if (!formData.selectedCategories || formData.selectedCategories.length === 0) {
        newErrors.categories = 'At least one category must be selected'
      }
      break
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
} 