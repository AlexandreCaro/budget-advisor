import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    console.log('POST /api/trip-plans called')
    const session = await getServerSession(authOptions)
    console.log('Session data:', session)
    
    if (!session?.user?.email) {
      console.log('No user email in session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    console.log('Received trip plan data:', data)
    console.log('Selected categories:', data.expenses)

    // First, find or create the user
    const user = await prisma.user.upsert({
      where: {
        email: session.user.email,
      },
      create: {
        email: session.user.email,
        name: session.user.name || null,
      },
      update: {},
    })

    console.log('User found/created:', user)

    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create initial trip plan with name and expenses
    const tripPlan = await prisma.tripPlan.create({
      data: {
        userId: user.id,
        name: data.name,
        status: 'DRAFT',
        country: data.country || '',
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        travelers: data.travelers ? parseInt(data.travelers) : 1,
        currency: data.currency || 'USD',
        overallBudget: data.overallBudget ? parseFloat(data.overallBudget) : 0,
        expenses: {
          create: data.selectedCategories?.map(categoryKey => {
            const expense = data.expenses.find(e => e.key === categoryKey)
            return {
              name: expense.name,
              key: expense.key,
              preBooked: expense.preBooked || false,
              cost: expense.cost ? parseFloat(expense.cost) : null,
              budgetType: expense.budgetType || 'percentage',
              budgetValue: parseFloat(expense.budgetValue) || 0,
              defaultPercentage: expense.defaultPercentage || 0,
              isTracked: expense.isTracked || true,
            }
          }) || [],
        },
      },
      include: {
        expenses: true,
      },
    })

    console.log('Created trip plan with expenses:', tripPlan)
    return NextResponse.json(tripPlan)
  } catch (error) {
    console.error('Error in trip-plans POST:', error)
    return NextResponse.json(
      { error: 'Failed to create trip plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, ...updateData } = data

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

    // Update trip plan
    const updatedPlan = await prisma.tripPlan.update({
      where: { id },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        travelers: updateData.travelers ? parseInt(updateData.travelers.toString()) : undefined,
        overallBudget: updateData.overallBudget ? parseFloat(updateData.overallBudget.toString()) : undefined,
      },
    })

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Error in trip-plans PATCH:', error)
    return NextResponse.json(
      { error: 'Failed to update trip plan' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('No session found in trip-plans GET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Fetching trip plans for user:', user.id)

    const tripPlans = await prisma.tripPlan.findMany({
      where: {
        userId: user.id,
      },
      include: {
        expenses: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    console.log('Found trip plans:', {
      count: tripPlans.length,
      tripPlanIds: tripPlans.map(plan => plan.id)
    })

    return NextResponse.json(tripPlans)
  } catch (error) {
    console.error('Error in trip-plans GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trip plans' },
      { status: 500 }
    )
  }
} 