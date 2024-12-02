export interface TripPlan {
  id: string
  name: string
  country: string
  startDate?: string
  endDate?: string
  currency: string
  overallBudget?: number
  status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED'
  expenses: {
    key: string
    name: string
  }[]
} 