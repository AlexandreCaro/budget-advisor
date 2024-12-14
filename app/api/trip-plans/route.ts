import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity'
import { TripStatus } from '@prisma/client'
import { validateTripData } from '@/components/trip-planner/form-validation'

const DEFAULT_CATEGORY_VALUES = {
  flight: { defaultPercentage: 30, budgetValue: 30 },
  accommodation: { defaultPercentage: 30, budgetValue: 30 },
  localTransportation: { defaultPercentage: 10, budgetValue: 10 },
  food: { defaultPercentage: 15, budgetValue: 15 },
  activities: { defaultPercentage: 10, budgetValue: 10 },
  shopping: { defaultPercentage: 5, budgetValue: 5 },
  carRental: { defaultPercentage: 0, budgetValue: 0 }
} as const;

// Helper function to verify trip ownership
async function verifyTripOwnership(tripId: string, userId: string) {
  const tripPlan = await prisma.tripPlan.findFirst({
    where: {
      id: tripId,
      userId: userId,
    },
  })
  return !!tripPlan
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session check:', {
      exists: !!session,
      userId: session?.user?.id
    });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Get trips with the same structure that worked in test-db.ts
    const trips = await prisma.tripPlan.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        expenses: true,
        departureLocation: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('Trips fetched:', {
      count: trips.length,
      firstTrip: trips[0] ? {
        id: trips[0].id,
        name: trips[0].name,
        expensesCount: trips[0].expenses.length,
        hasDepartureLocation: !!trips[0].departureLocation
      } : null
    });

    // Return raw data without transformation for now
    return NextResponse.json(trips);

  } catch (error) {
    console.error('Database error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to fetch trips', details: error.message },
      { status: 500 }
    );
  }
}

interface ExpenseData {
  name: string;
  key: string;
  budgetType: string;
  budgetValue: string;
  preBooked?: boolean;
  cost?: string | null;
  defaultPercentage: number;
  selectedTier?: string;
  estimates?: any;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log('Creating new trip with data:', data);

    if (!data.name?.trim()) {
      return NextResponse.json({
        error: 'Validation failed',
        details: { message: 'Trip name is required' }
      }, { status: 400 });
    }

    // Create minimal trip with only required fields
    const trip = await prisma.tripPlan.create({
      data: {
        userId: session.user.id,
        name: data.name.trim(),
        status: 'DRAFT',
        country: '',
        startDate: new Date(),
        endDate: new Date(),
        travelers: 1,
        currency: 'USD',
        overallBudget: 0,
        selectedCategories: []
      }
    });

    console.log('Trip created successfully:', trip);
    return NextResponse.json(trip);

  } catch (error) {
    console.error('Error creating trip:', error);
    console.error('Full error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.json({ 
      error: 'Failed to create trip',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id } = data

    if (!id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 })
    }

    // Verify ownership
    const isOwner = await verifyTripOwnership(id, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Handle departure location
    if (data.departureLocation) {
      await prisma.departureLocation.upsert({
        where: { tripPlanId: id },
        create: {
          tripPlanId: id,
          lat: data.departureLocation.lat,
          lng: data.departureLocation.lng,
          name: data.departureLocation.city || '',
          code: data.departureLocation.code,
          airport: data.departureLocation.airport
        },
        update: {
          lat: data.departureLocation.lat,
          lng: data.departureLocation.lng,
          name: data.departureLocation.city || '',
          code: data.departureLocation.code,
          airport: data.departureLocation.airport
        }
      })
    }

    // Handle expenses
    if (data.expenses) {
      for (const expense of data.expenses) {
        await prisma.expenseCategory.upsert({
          where: {
            tripPlanId_key: {
              tripPlanId: id,
              key: expense.key
            }
          },
          create: {
            tripPlanId: id,
            name: expense.name,
            key: expense.key,
            budgetType: expense.budgetType || 'percentage',
            budgetValue: parseFloat(expense.budgetValue || '0'),
            preBooked: expense.preBooked || false,
            cost: expense.cost ? parseFloat(expense.cost) : null,
            defaultPercentage: expense.defaultPercentage || 0,
            selectedTier: expense.selectedTier || 'medium',
            estimates: expense.estimates || null
          },
          update: {
            budgetType: expense.budgetType || 'percentage',
            budgetValue: parseFloat(expense.budgetValue || '0'),
            preBooked: expense.preBooked || false,
            cost: expense.cost ? parseFloat(expense.cost) : null,
            selectedTier: expense.selectedTier || 'medium',
            estimates: expense.estimates || null
          }
        })
      }
    }

    // Update trip plan
    const updatedPlan = await prisma.tripPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.country && { country: data.country }),
        ...(data.city && { city: data.city }),
        ...(data.cities && { cities: data.cities }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.travelers && { travelers: parseInt(data.travelers.toString()) }),
        ...(data.currency && { currency: data.currency }),
        ...(data.overallBudget && { overallBudget: parseFloat(data.overallBudget.toString()) }),
        ...(data.selectedCategories && { selectedCategories: data.selectedCategories }),
        ...(data.status && { status: data.status as TripStatus })
      },
      include: {
        expenses: true,
        departureLocation: true
      }
    })

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Error updating trip plan:', error)
    return NextResponse.json(
      { error: 'Failed to update trip plan', details: error },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // First, update or create departure location
    if (data.departureLocation) {
      await prisma.departureLocation.upsert({
        where: {
          tripPlanId: id
        },
        create: {
          tripPlanId: id,
          lat: data.departureLocation.lat,
          lng: data.departureLocation.lng,
          name: data.departureLocation.name
        },
        update: {
          lat: data.departureLocation.lat,
          lng: data.departureLocation.lng,
          name: data.departureLocation.name
        }
      });
    }

    // Then update expenses if provided
    if (data.expenses) {
      await Promise.all(
        data.expenses.map((expense: ExpenseData) =>
          prisma.expenseCategory.upsert({
            where: {
              tripPlanId_key: {
                tripPlanId: id,
                key: expense.key
              }
            },
            create: {
              tripPlanId: id,
              name: expense.name,
              key: expense.key,
              budgetType: expense.budgetType || 'percentage',
              budgetValue: parseFloat(expense.budgetValue || '0'),
              preBooked: expense.preBooked || false,
              cost: expense.cost ? parseFloat(expense.cost) : null,
              defaultPercentage: expense.defaultPercentage || 0,
              selectedTier: expense.selectedTier || 'medium',
              estimates: expense.estimates || null
            },
            update: {
              budgetType: expense.budgetType || 'percentage',
              budgetValue: parseFloat(expense.budgetValue || '0'),
              preBooked: expense.preBooked || false,
              cost: expense.cost ? parseFloat(expense.cost) : null,
              selectedTier: expense.selectedTier || 'medium',
              estimates: expense.estimates || null
            }
          })
        )
      );
    }

    // Finally update the trip plan
    const updatedPlan = await prisma.tripPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.country && { country: data.country }),
        ...(data.city && { city: data.city }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.travelers && { travelers: parseInt(data.travelers.toString()) }),
        ...(data.currency && { currency: data.currency }),
        ...(data.overallBudget && { overallBudget: parseFloat(data.overallBudget.toString()) }),
        ...(data.selectedCategories && { selectedCategories: data.selectedCategories }),
        ...(data.status && { status: data.status as TripStatus })
      },
      include: {
        expenses: true,
        DepartureLocation: true
      }
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating trip plan:', error);
    return NextResponse.json(
      { error: 'Failed to update trip plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { route: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [tripId] = params.route || []
    
    // Verify ownership
    const isOwner = await verifyTripOwnership(tripId, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.tripPlan.delete({
      where: { id: tripId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to delete trip plan' },
      { status: 500 }
    )
  }
}

// Helper functions
async function handleCompleteAction(tripId: string, data: any) {
  const updatedPlan = await prisma.$transaction(async (tx) => {
    const plan = await tx.tripPlan.update({
      where: { id: tripId },
      data: {
        name: data.name,
        country: data.country,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        travelers: parseInt(data.travelers),
        currency: data.currency,
        overallBudget: parseFloat(data.overallBudget),
        selectedCategories: data.selectedCategories,
        status: 'COMPLETED'
      }
    })

    if (data.expenses?.length) {
      for (const expense of data.expenses) {
        await tx.expenseCategory.upsert({
          where: {
            tripPlanId_key: {
              tripPlanId: tripId,
              key: expense.key
            }
          },
          create: {
            tripPlanId: tripId,
            name: expense.name,
            key: expense.key,
            preBooked: expense.preBooked || false,
            cost: expense.preBooked ? parseFloat(expense.cost) : null,
            budgetType: expense.budgetType || 'percentage',
            budgetValue: parseFloat(expense.budgetValue),
            defaultPercentage: expense.defaultPercentage,
            selectedTier: expense.selectedTier || 'medium',
            isTracked: true
          },
          update: {
            preBooked: expense.preBooked || false,
            cost: expense.preBooked ? parseFloat(expense.cost) : null,
            budgetType: expense.budgetType || 'percentage',
            budgetValue: parseFloat(expense.budgetValue),
            defaultPercentage: expense.defaultPercentage,
            selectedTier: expense.selectedTier || 'medium'
          }
        })
      }
    }

    return tx.tripPlan.findUnique({
      where: { id: tripId },
      include: {
        expenses: true,
        city: true,
        DepartureLocation: true
      }
    })
  })

  return NextResponse.json(updatedPlan)
}

async function handleBudgetUpdate(tripId: string, data: any) {
  const { overallBudget, expenses, estimates } = data

  const updatedPlan = await prisma.$transaction(async (tx) => {
    await tx.tripPlan.update({
      where: { id: tripId },
      data: { overallBudget }
    })

    for (const expense of expenses) {
      await tx.expenseCategory.update({
        where: {
          tripPlanId_key: {
            tripPlanId: tripId,
            key: expense.key
          }
        },
        data: {
          budgetValue: parseFloat(expense.budgetValue.toString()),
          selectedTier: expense.selectedTier || 'medium',
          estimates: estimates?.[expense.key] || null
        }
      })
    }

    return tx.tripPlan.findUnique({
      where: { id: tripId },
      include: {
        expenses: true,
        city: true,
        DepartureLocation: true
      }
    })
  })

  return NextResponse.json(updatedPlan)
} 