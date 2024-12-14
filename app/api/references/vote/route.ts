import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { referenceId, category, source, isPositive } = await req.json()

    // Upsert the vote (update if exists, create if doesn't)
    const vote = await prisma.referenceVote.upsert({
      where: {
        userId_referenceId: {
          userId: session.user.id,
          referenceId
        }
      },
      update: {
        isPositive
      },
      create: {
        userId: session.user.id,
        referenceId,
        category,
        source,
        isPositive
      }
    })

    return NextResponse.json(vote)
  } catch (error) {
    console.error('Error saving vote:', error)
    return NextResponse.json(
      { error: 'Failed to save vote' },
      { status: 500 }
    )
  }
} 