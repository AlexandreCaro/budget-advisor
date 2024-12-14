import { NextResponse } from 'next/server';

// Cache the responses for 1 hour
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const cache = new Map<string, { data: any; timestamp: number }>();

export async function GET() {
  try {
    // Use a reliable IP geolocation service
    const response = await fetch('http://ip-api.com/json/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();

    // Return standardized location data
    return NextResponse.json({
      lat: data.lat,
      lng: data.lon,
      city: data.city,
      country: data.country,
      countryCode: data.countryCode,
    });

  } catch (error) {
    console.error('Location detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect location' }, 
      { status: 500 }
    );
  }
} 