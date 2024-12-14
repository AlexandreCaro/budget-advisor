import { prisma } from "@/lib/prisma";

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface FlightRoute {
  origin: Airport;
  destination: Airport;
  distance: number;
  estimatedDuration: number;
  airlines: string[];
  priceFactors: {
    seasonality: number;
    demand: number;
    competition: number;
  };
}

export async function getCurrentLocation(): Promise<{lat: number, lng: number}> {
  // Use browser geolocation API
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error)
      );
    } else {
      reject(new Error("Geolocation not available"));
    }
  });
}

export async function findNearestAirports(lat: number, lng: number, limit = 3): Promise<Airport[]> {
  // Call external API (like Amadeus or AviationStack) to get nearest airports
  const response = await fetch(`/api/airports/nearest?lat=${lat}&lng=${lng}&limit=${limit}`);
  return response.json();
}

export async function getFlightRoutes(origin: Airport, destination: Airport): Promise<FlightRoute[]> {
  // Call flight search API to get available routes and prices
  const routes = await fetch(`/api/flights/routes?from=${origin.code}&to=${destination.code}`);
  return routes.json();
}

export async function getFlightPrices(route: FlightRoute, tier: 'budget' | 'medium' | 'premium'): Promise<{
  min: number;
  max: number;
  average: number;
  references: Array<{
    airline: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    price: number;
    class: string;
    url: string;
  }>;
}> {
  try {
    // Call real flight pricing API
    const response = await fetch(`/api/flights/prices`, {
      method: 'POST',
      body: JSON.stringify({
        route,
        tier,
        dates: {
          start: new Date(),
          end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch flight prices');
    }

    const data = await response.json();
    
    // Add real flight references
    data.references = data.flights.map((flight: any) => ({
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      departure: flight.departureTime,
      arrival: flight.arrivalTime,
      price: flight.price,
      class: tier,
      url: `https://www.skyscanner.com/transport/flights/${route.origin.code}/${route.destination.code}/${flight.date}/${flight.flightNumber}`
    }));

    return data;
  } catch (error) {
    console.error('Error fetching flight prices:', error);
    // Return fallback data if API fails
    return {
      min: 0,
      max: 0,
      average: 0,
      references: []
    };
  }
} 