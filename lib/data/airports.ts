interface Airport {
  city: string;
  airport: string;
  code: string;
  lat: number;
  lng: number;
  country: string;
  major: boolean;
  priority: number;
}

// Sample major airports data
const AIRPORTS: Airport[] = [
  {
    city: "Tel Aviv",
    airport: "Ben Gurion International",
    code: "TLV",
    lat: 32.0055,
    lng: 34.8854,
    country: "IL",
    major: true,
    priority: 1
  },
  {
    city: "New York",
    airport: "John F. Kennedy International",
    code: "JFK",
    lat: 40.6413,
    lng: -73.7781,
    country: "United States",
    major: true,
    priority: 2
  },
  {
    city: "Los Angeles",
    airport: "Los Angeles International",
    code: "LAX",
    lat: 33.9416,
    lng: -118.4085,
    country: "United States",
    major: true,
    priority: 2
  },
  {
    city: "London",
    airport: "Heathrow",
    code: "LHR",
    lat: 51.4700,
    lng: -0.4543,
    country: "United Kingdom",
    major: true,
    priority: 2
  },
  {
    city: "Paris",
    airport: "Charles de Gaulle",
    code: "CDG",
    lat: 49.0097,
    lng: 2.5479,
    country: "France",
    major: true,
    priority: 2
  },
  {
    city: "Tokyo",
    airport: "Narita International",
    code: "NRT",
    lat: 35.7720,
    lng: 140.3929,
    country: "Japan",
    major: true,
    priority: 2
  },
  {
    city: "Dubai",
    airport: "Dubai International",
    code: "DXB",
    lat: 25.2532,
    lng: 55.3657,
    country: "United Arab Emirates",
    major: true,
    priority: 2
  },
  {
    city: "Singapore",
    airport: "Changi",
    code: "SIN",
    lat: 1.3644,
    lng: 103.9915,
    country: "Singapore",
    major: true,
    priority: 2
  },
  {
    city: "Hong Kong",
    airport: "Hong Kong International",
    code: "HKG",
    lat: 22.3080,
    lng: 113.9185,
    country: "China",
    major: true,
    priority: 2
  },
  {
    city: "Sydney",
    airport: "Kingsford Smith",
    code: "SYD",
    lat: -33.9399,
    lng: 151.1753,
    country: "Australia",
    major: true,
    priority: 2
  },
  {
    city: "Frankfurt",
    airport: "Frankfurt Airport",
    code: "FRA",
    lat: 50.0379,
    lng: 8.5622,
    country: "Germany",
    major: true,
    priority: 2
  }
];

export function getAllAirports(): Airport[] {
  return AIRPORTS;
}

export function searchAirports(query: string): Airport[] {
  const normalizedQuery = query.toLowerCase();
  return AIRPORTS.filter(airport => 
    airport.city.toLowerCase().includes(normalizedQuery) ||
    airport.airport.toLowerCase().includes(normalizedQuery) ||
    airport.code.toLowerCase().includes(normalizedQuery)
  );
}

export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find(airport => airport.code === code);
}

export function formatAirportDisplay(airport: Airport): string {
  return `${airport.city} (${airport.code})`;
}

// Add a helper function to find nearest airport
export function findNearestAirport(lat: number, lng: number): Airport | null {
  if (AIRPORTS.length === 0) return null;

  // Check if coordinates are in Israel (rough boundaries)
  const isInIsrael = lat >= 29.5 && lat <= 33.3 && lng >= 34.2 && lng <= 35.9;
  
  if (isInIsrael) {
    // If in Israel, return Ben Gurion Airport
    const benGurion = AIRPORTS.find(a => a.code === 'TLV');
    if (benGurion) return benGurion;
  }

  // Otherwise find the nearest airport by distance
  let nearest = AIRPORTS[0];
  let shortestDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);

  for (const airport of AIRPORTS) {
    const distance = calculateDistance(lat, lng, airport.lat, airport.lng);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearest = airport;
    }
  }

  return nearest;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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