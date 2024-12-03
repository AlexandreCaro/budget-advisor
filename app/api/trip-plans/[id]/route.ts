import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const DEFAULT_CATEGORY_VALUES = {
  flight: { defaultPercentage: 30, budgetValue: 30 },
  accommodation: { defaultPercentage: 30, budgetValue: 30 },
  localTransportation: { defaultPercentage: 10, budgetValue: 10 },
  food: { defaultPercentage: 15, budgetValue: 15 },
  activities: { defaultPercentage: 10, budgetValue: 10 },
  shopping: { defaultPercentage: 5, budgetValue: 5 },
  carRental: { defaultPercentage: 0, budgetValue: 0 }
} as const;

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id } = params

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const existingPlan = await prisma.tripPlan.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Trip plan not found' }, { status: 404 })
    }

    // Update trip plan
    const updatedPlan = await prisma.tripPlan.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        travelers: data.travelers ? parseInt(data.travelers.toString()) : undefined,
        overallBudget: data.overallBudget ? parseFloat(data.overallBudget.toString()) : undefined,
      },
      include: {
        expenses: true,
      },
    })

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Error in trip-plans PUT:', error)
    return NextResponse.json(
      { error: 'Failed to update trip plan' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tripId = params.id

    const tripPlan = await prisma.tripPlan.findFirst({
      where: {
        id: tripId,
        userId: session.user.id,
      },
      include: {
        expenses: true,
      },
    })

    if (!tripPlan) {
      return NextResponse.json({ error: 'Trip plan not found' }, { status: 404 })
    }

    return NextResponse.json(tripPlan)
  } catch (error) {
    console.error('Error fetching trip plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trip plan' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const tripPlan = await prisma.tripPlan.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!tripPlan) {
      return NextResponse.json({ error: 'Trip plan not found' }, { status: 404 })
    }

    // Delete the trip plan
    await prisma.tripPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in trip-plans DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to delete trip plan' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('=== PATCH Trip Plan ===');
    console.log('Session:', session);
    console.log('Trip ID:', params.id);

    if (!session?.user?.id) {
      console.error('No user session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tripId = params.id;
    const data = await req.json();
    
    console.log('Received update data:', JSON.stringify(data, null, 2));

    // Verify ownership
    const existingPlan = await prisma.tripPlan.findFirst({
      where: {
        id: tripId,
        userId: session.user.id,
      },
      include: {
        expenses: true
      }
    });

    if (!existingPlan) {
      console.error('Trip plan not found or unauthorized');
      return NextResponse.json({ error: 'Trip plan not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData = {
      name: data.name,
      country: data.country,
      currency: data.currency,
      selectedCategories: data.selectedCategories || [],
      status: data.status || 'DRAFT',
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      travelers: data.travelers ? parseInt(data.travelers.toString()) : undefined,
      overallBudget: data.overallBudget ? parseFloat(data.overallBudget.toString()) : undefined,
    };

    console.log('Prepared update data:', JSON.stringify(updateData, null, 2));

    try {
      // Begin transaction
      const updatedPlan = await prisma.$transaction(async (tx) => {
        // Update trip plan
        const updated = await tx.tripPlan.update({
          where: { id: tripId },
          data: updateData,
        });

        // If expenses are provided, update them
        if (data.expenses) {
          // First delete existing expenses
          await tx.expenseCategory.deleteMany({
            where: { tripPlanId: tripId }
          });

          // Then create new ones
          await tx.expenseCategory.createMany({
            data: data.expenses.map((expense: any) => ({
              tripPlanId: tripId,
              name: expense.name,
              key: expense.key,
              preBooked: expense.preBooked || false,
              cost: expense.cost ? parseFloat(expense.cost) : null,
              budgetType: expense.budgetType || 'percentage',
              budgetValue: parseFloat(expense.budgetValue || '0'),
              defaultPercentage: parseFloat(expense.defaultPercentage?.toString() || '0'),
              isTracked: expense.isTracked ?? true,
              spent: 0,
              selectedTier: expense.selectedTier || 'medium'
            }))
          });
        }

        // Return updated plan with expenses
        return tx.tripPlan.findUnique({
          where: { id: tripId },
          include: { expenses: true }
        });
      });

      console.log('Successfully updated plan:', {
        id: updatedPlan?.id,
        name: updatedPlan?.name,
        expensesCount: updatedPlan?.expenses.length
      });

      return NextResponse.json(updatedPlan);
    } catch (error) {
      console.error('Database transaction error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating trip plan:', error);
    return NextResponse.json(
      { error: 'Failed to update trip plan', details: error },
      { status: 500 }
    );
  }
} 