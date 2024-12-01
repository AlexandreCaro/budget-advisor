import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { country, travelers, nights } = await req.json()

  // This would be your actual Perplexity API call
  // For now, we'll return more realistic default ranges based on the country
  const costRanges = {
    'USA': {
      accommodation: { min: 150 * nights, max: 300 * nights },
      transportation: { min: 50 * nights, max: 100 * nights },
      flight: { min: 500, max: 1200 }
    },
    'France': {
      accommodation: { min: 120 * nights, max: 250 * nights },
      transportation: { min: 40 * nights, max: 80 * nights },
      flight: { min: 600, max: 1400 }
    },
    'Japan': {
      accommodation: { min: 100 * nights, max: 300 * nights },
      transportation: { min: 30 * nights, max: 70 * nights },
      flight: { min: 800, max: 1600 }
    },
    'Australia': {
      accommodation: { min: 130 * nights, max: 280 * nights },
      transportation: { min: 45 * nights, max: 90 * nights },
      flight: { min: 1000, max: 2000 }
    },
    'Brazil': {
      accommodation: { min: 80 * nights, max: 200 * nights },
      transportation: { min: 25 * nights, max: 60 * nights },
      flight: { min: 700, max: 1500 }
    }
  }

  // Adjust costs based on number of travelers
  const roomsNeeded = Math.ceil(travelers / 2)
  const costs = costRanges[country] || costRanges['USA']
  
  costs.accommodation.min *= roomsNeeded
  costs.accommodation.max *= roomsNeeded
  costs.transportation.min *= Math.sqrt(travelers)
  costs.transportation.max *= Math.sqrt(travelers)
  costs.flight.min *= travelers
  costs.flight.max *= travelers

  return NextResponse.json(costs)
}

