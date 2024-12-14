import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

// Initialize Prisma client outside of the route handlers
const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const trip = await prisma.tripPlan.findFirst({
      where: { id: tripId },
      select: { estimates: true }
    });

    return NextResponse.json({ estimates: trip?.estimates || null });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, estimates } = body;

    if (!tripId || !estimates) {
      return NextResponse.json(
        { error: 'Trip ID and estimates are required' },
        { status: 400 }
      );
    }

    // Update trip with new estimates
    const updatedTrip = await prisma.tripPlan.update({
      where: { id: tripId },
      data: { estimates },
      select: {
        id: true,
        estimates: true
      }
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error('Error saving estimates:', error);
    return NextResponse.json(
      { error: 'Failed to save estimates' },
      { status: 500 }
    );
  }
} 