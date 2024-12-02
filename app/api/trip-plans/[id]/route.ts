import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

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
  // ... existing GET handler
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