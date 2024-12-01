import { NextResponse } from 'next/server'

type CostRange = {
  min: number;
  max: number;
}

type CountryCosts = {
  accommodation: CostRange;
  transportation: CostRange;
  flight: CostRange;
}

type CostRanges = {
  [key: string]: CountryCosts;
}

const costRanges: CostRanges = {
  USA: {
    accommodation: { min: 100, max: 300 },
    transportation: { min: 30, max: 100 },
    flight: { min: 300, max: 1000 }
  },
  France: {
    accommodation: { min: 80, max: 250 },
    transportation: { min: 20, max: 80 },
    flight: { min: 400, max: 1200 }
  },
  // ... other countries
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') || 'USA'
  const travelers = parseInt(searchParams.get('travelers') || '1')
  const nights = parseInt(searchParams.get('nights') || '1')

  // Adjust costs based on number of travelers
  const roomsNeeded = Math.ceil(travelers / 2)
  const costs = costRanges[country as keyof typeof costRanges] || costRanges['USA']
  
  costs.accommodation.min *= roomsNeeded
  costs.accommodation.max *= roomsNeeded

  // Adjust for number of nights
  costs.accommodation.min *= nights
  costs.accommodation.max *= nights

  // Adjust transportation costs for travelers
  costs.transportation.min *= travelers
  costs.transportation.max *= travelers

  // Adjust flight costs for travelers
  costs.flight.min *= travelers
  costs.flight.max *= travelers

  return NextResponse.json(costs)
}

