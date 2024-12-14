import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { email }
    });

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error('Error validating user:', error);
    return NextResponse.json(
      { error: 'Failed to validate user' },
      { status: 500 }
    );
  }
} 