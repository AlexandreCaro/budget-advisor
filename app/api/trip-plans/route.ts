import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity'

export async function POST(req: Request) {
  try {
    console.log('=== POST /api/trip-plans ===');
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session?.user?.id) {
      console.error('No user session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Request body:', body);

    try {
      const tripPlan = await prisma.$transaction(async (tx) => {
        // Create trip plan
        const plan = await tx.tripPlan.create({
          data: {
            userId: session.user.id,
            name: body.name || 'Untitled Trip',
            status: 'DRAFT',
            selectedCategories: [],
            startDate: new Date(),
            endDate: new Date(),
            travelers: 1,
            currency: 'USD',
            overallBudget: 0
          }
        });

        // Create default expenses
        await tx.expenseCategory.createMany({
          data: DEFAULT_EXPENSE_CATEGORIES.map(category => ({
            tripPlanId: plan.id,
            name: category.name,
            key: category.key,
            preBooked: false,
            cost: null,
            budgetType: 'percentage',
            budgetValue: category.defaultPercentage,
            defaultPercentage: category.defaultPercentage,
            isTracked: true,
            spent: 0
          }))
        });

        // Return complete trip plan with expenses
        return tx.tripPlan.findUnique({
          where: { id: plan.id },
          include: { expenses: true }
        });
      });

      console.log('Created trip plan:', tripPlan);
      return NextResponse.json(tripPlan);
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating trip plan:', error);
    return NextResponse.json(
      { error: 'Failed to create trip plan', details: error },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, selectedCategories, ...updateData } = data

    console.log('Updating trip plan:', {
      id,
      selectedCategories,
      updateData
    });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
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

    // Update trip plan with selectedCategories
    const updatedPlan = await prisma.tripPlan.update({
      where: { id },
      data: {
        ...updateData,
        selectedCategories: selectedCategories || existingPlan.selectedCategories,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        travelers: updateData.travelers ? parseInt(updateData.travelers.toString()) : undefined,
        overallBudget: updateData.overallBudget ? parseFloat(updateData.overallBudget.toString()) : undefined,
      },
      include: {
        expenses: true,
      }
    })

    console.log('Updated trip plan:', {
      id: updatedPlan.id,
      selectedCategories: updatedPlan.selectedCategories,
      expensesCount: updatedPlan.expenses.length
    });

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Error in trip-plans PATCH:', error)
    return NextResponse.json(
      { error: 'Failed to update trip plan' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching trips for user:', session.user.id)

    const trips = await prisma.tripPlan.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        country: true,
        startDate: true,
        endDate: true,
        currency: true,
        overallBudget: true,
        selectedCategories: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('Found trips:', trips.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status
    })))

    return NextResponse.json(trips)
  } catch (error) {
    console.error('Error in GET /api/trip-plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trips', details: error },
      { status: 500 }
    )
  }
} 