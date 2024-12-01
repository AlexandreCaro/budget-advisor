import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    const tripPlan = await prisma.tripPlan.create({
      data: {
        userId: data.userId,
        country: data.country,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        travelers: data.travelers,
        currency: data.currency,
        overallBudget: data.overallBudget,
        expenses: {
          create: data.expenses,
        },
      },
      include: {
        expenses: true,
      },
    })

    return NextResponse.json(tripPlan)
  } catch (error) {
    console.error('Error creating trip plan:', error)
    return NextResponse.json(
      { error: 'Failed to create trip plan' },
      { status: 500 }
    )
  }
} 