import { NextResponse } from "next/server";
import { getAllAirports, getAirportByCode, formatAirportDisplay } from "@/lib/data/airports";

const LOCATIONS = getAllAirports();

// Helper function to calculate distance between two points
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatLocationResponse(loc: any) {
  return {
    lat: loc.lat,
    lng: loc.lng,
    city: loc.city,
    name: loc.city,
    airport: loc.code,
    code: loc.code,
    display: formatAirportDisplay(loc)
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase();
  const isInitial = searchParams.get('initial') === 'true';
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const isNearest = searchParams.get('nearest') === 'true';
  const code = searchParams.get('code');

  try {
    // If code is provided, return the specific airport
    if (code) {
      const airport = getAirportByCode(code);
      if (airport) {
        return NextResponse.json(formatLocationResponse(airport));
      }
    }

    // Handle nearest airport search
    if (isNearest && !isNaN(lat) && !isNaN(lng)) {
      const airports = Array.from(LOCATIONS)
        .map(airport => ({
          ...airport,
          distance: calculateDistance(lat, lng, airport.lat, airport.lng)
        }))
        .sort((a, b) => a.distance - b.distance);

      const nearestAirport = airports[0];
      
      if (nearestAirport) {
        return NextResponse.json(formatLocationResponse(nearestAirport));
      }
    }

    if (isInitial) {
      const popularLocations = Array.from(LOCATIONS)
        .slice(0, 10)
        .map(formatLocationResponse);
      
      return NextResponse.json(popularLocations);
    }

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const results = Array.from(LOCATIONS)
      .filter(location => 
        location.city.toLowerCase().includes(query) || 
        location.airport.toLowerCase().includes(query) ||
        location.code.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map(formatLocationResponse);

    return NextResponse.json(results);

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json([], { status: 200 });
  }
} 