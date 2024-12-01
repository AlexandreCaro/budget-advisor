export interface TripCosts {
  accommodation: number
  transportation: number
  food: number
  activities: number
  misc: number
}

export function calculateTotalCost(costs: TripCosts): number {
  return Object.values(costs).reduce((sum, cost) => sum + cost, 0)
}

export function estimateDailyCost(location: string, travelStyle: 'budget' | 'moderate' | 'luxury'): TripCosts {
  // Basic estimation logic - you can adjust these values
  const baseRates = {
    budget: {
      accommodation: 50,
      transportation: 10,
      food: 30,
      activities: 20,
      misc: 10
    },
    moderate: {
      accommodation: 150,
      transportation: 30,
      food: 60,
      activities: 50,
      misc: 30
    },
    luxury: {
      accommodation: 300,
      transportation: 100,
      food: 120,
      activities: 150,
      misc: 100
    }
  }

  return baseRates[travelStyle]
}

export function estimateCosts(_country: string, _travelers: number, _nights: number, _startDate: Date) {
  // Your estimation logic here
  return {
    flight: { min: 0, max: 0 },
    accommodation: { min: 0, max: 0 },
    localTransportation: { min: 0, max: 0 },
    food: { min: 0, max: 0 },
    activities: { min: 0, max: 0 },
    shopping: { min: 0, max: 0 },
    carRental: { min: 0, max: 0 },
  }
}

export function calculateDefaultBudget(_country: string, _travelers: number, _nights: number, _startDate: Date): number {
  return 1000; // your calculation logic here
}

