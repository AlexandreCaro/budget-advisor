import { NextResponse } from "next/server";
import { findNearestAirport, getAllAirports } from "@/lib/data/airports";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    console.log('Received coordinates:', { lat, lng });

    // If no coordinates provided, return list of major airports
    if (!lat || !lng) {
      console.log('No coordinates provided, returning all airports');
      const airports = getAllAirports();
      
      // Format the response
      const formattedAirports = airports.map(airport => ({
        code: airport.code,
        city: airport.city,
        country: airport.country,
        lat: airport.lat,
        lng: airport.lng,
        name: airport.airport,
        label: `${airport.city} - ${airport.airport} (${airport.code})`
      }));

      return NextResponse.json({ 
        locations: formattedAirports 
      });
    }

    // Find nearest airport
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    console.log('Finding nearest airport to:', { latitude, longitude });
    const nearestAirport = findNearestAirport(latitude, longitude);
    
    if (!nearestAirport) {
      return NextResponse.json(
        { error: 'No airports found' },
        { status: 404 }
      );
    }

    console.log('Found nearest airport:', nearestAirport);
    
    // Return in the same format as the locations array
    return NextResponse.json({
      locations: [{
        code: nearestAirport.code,
        city: nearestAirport.city,
        country: nearestAirport.country,
        lat: nearestAirport.lat,
        lng: nearestAirport.lng,
        name: nearestAirport.airport,
        label: `${nearestAirport.city} - ${nearestAirport.airport} (${nearestAirport.code})`
      }]
    });

  } catch (error) {
    console.error('Error finding airports:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 