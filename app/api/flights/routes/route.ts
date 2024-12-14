import { NextResponse } from "next/server";
import { AMADEUS_API_KEY, AMADEUS_API_SECRET } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    // Call Amadeus or similar API to get real flight routes
    const response = await fetch(`https://api.amadeus.com/v1/shopping/flight-destinations?origin=${from}&destination=${to}`, {
      headers: {
        'Authorization': `Bearer ${AMADEUS_API_KEY}`
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching flight routes:', error);
    return NextResponse.json({ error: 'Failed to fetch flight routes' }, { status: 500 });
  }
} 