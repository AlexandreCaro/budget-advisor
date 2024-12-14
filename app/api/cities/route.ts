import { NextResponse } from 'next/server';
import path from 'path'
import fs from 'fs'

interface CityData {
  country: string;
  name: string;
  lat: string;
  lng: string;
  population: string;
}

function getCitiesData() {
  const filePath = path.join(process.cwd(), 'app', 'api', 'cities', 'data', 'cities.json')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(fileContents)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }

  // Filter cities by country and sort by population
  const cities = (getCitiesData() as CityData[])
    .filter(city => city.country === country)
    .sort((a, b) => parseInt(b.population) - parseInt(a.population))
    .slice(0, 50) // Take top 50 cities
    .map(city => ({
      value: `${city.lat},${city.lng}`,
      label: city.name,
      lat: parseFloat(city.lat),
      lng: parseFloat(city.lng),
      population: parseInt(city.population)
    }));

  return NextResponse.json(cities);
} 