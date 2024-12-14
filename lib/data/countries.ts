export interface Country {
  code: string;
  value: string;
  label: string;
}

export type CountryCode = Country['code'];

export const countries: Country[] = [
  { code: "US", value: "US", label: "United States" },
  { code: "GB", value: "GB", label: "United Kingdom" },
  { code: "FR", value: "FR", label: "France" },
  { code: "DE", value: "DE", label: "Germany" },
  { code: "IT", value: "IT", label: "Italy" },
  { code: "ES", value: "ES", label: "Spain" },
  { code: "CA", value: "CA", label: "Canada" },
  { code: "AU", value: "AU", label: "Australia" },
  { code: "JP", value: "JP", label: "Japan" },
  { code: "BR", value: "BR", label: "Brazil" },
  { code: "MX", value: "MX", label: "Mexico" },
  { code: "IN", value: "IN", label: "India" },
  { code: "CN", value: "CN", label: "China" },
  { code: "RU", value: "RU", label: "Russia" },
  { code: "ZA", value: "ZA", label: "South Africa" },
  { code: "IL", value: "IL", label: "Israel" },
];

if (!Array.isArray(countries)) {
  console.error('countries is not properly initialized as an array');
}

export function getAllCountries(): Country[] {
  console.log('=== Getting All Countries ===');
  console.log('Countries array:', countries);
  
  if (!Array.isArray(countries)) {
    console.error('countries is not an array in getAllCountries');
    return [];
  }
  
  return countries;
}

export function searchCountries(query: string): Country[] {
  const normalizedQuery = query.toLowerCase();
  return countries.filter(country => 
    country.label.toLowerCase().includes(normalizedQuery) ||
    country.code.toLowerCase().includes(normalizedQuery)
  );
} 