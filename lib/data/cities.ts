import { CountryCode } from './countries';

export interface City {
  code: string;
  value: string;
  label: string;
  lat: number;
  lng: number;
  isInbound?: boolean;
  isOutbound?: boolean;
}

export const cities: City[] = [
  // United States
  { value: "nyc", label: "New York", code: "NYC", country: "US", lat: 40.7128, lng: -74.0060, population: 8419000 },
  { value: "lax", label: "Los Angeles", code: "LAX", country: "US", lat: 34.0522, lng: -118.2437, population: 3980000 },
  { value: "chi", label: "Chicago", code: "CHI", country: "US", lat: 41.8781, lng: -87.6298, population: 2746388 },
  
  // United Kingdom
  { value: "lon", label: "London", code: "LON", country: "GB", lat: 51.5074, lng: -0.1278, population: 8982000 },
  { value: "man", label: "Manchester", code: "MAN", country: "GB", lat: 53.4808, lng: -2.2426, population: 547627 },
  { value: "edi", label: "Edinburgh", code: "EDI", country: "GB", lat: 55.9533, lng: -3.1883, population: 488050 },
  
  // France
  { value: "par", label: "Paris", code: "PAR", country: "FR", lat: 48.8566, lng: 2.3522, population: 2148271 },
  { value: "lyo", label: "Lyon", code: "LYO", country: "FR", lat: 45.7640, lng: 4.8357, population: 513275 },
  { value: "mrs", label: "Marseille", code: "MRS", country: "FR", lat: 43.2965, lng: 5.3698, population: 861635 },
  
  // Add more cities for each country...
];

export function getCitiesForCountry(countryCode: string): City[] {
  // Early return if no country code
  if (!countryCode) {
    return [];
  }

  // Filter cities and return them directly
  return cities.filter(city => city.country === countryCode);
}

export function searchCities(query: string, countryCode?: CountryCode): City[] {
  console.log('=== Searching Cities ===');
  console.log('Query:', query);
  console.log('Country filter:', countryCode || 'none');
  
  const normalizedQuery = query.toLowerCase();
  const filteredCities = countryCode 
    ? cities.filter(city => city.country === countryCode)
    : cities;

  const results = filteredCities.filter(city => 
    city.label.toLowerCase().includes(normalizedQuery) ||
    city.code.toLowerCase().includes(normalizedQuery)
  );

  console.log('Search results:', {
    total: results.length,
    cities: results.map(city => ({
      label: city.label,
      value: city.value,
      code: city.code
    }))
  });

  return results;
}

export function getAllCities(): City[] {
  console.log('Getting all cities:', cities.length);
  return cities;
}

export function getAvailableCities(countryCode: string, selectedCities: string[]): City[] {
  return cities.filter(city => 
    city.country === countryCode && !selectedCities.includes(city.code)
  );
} 