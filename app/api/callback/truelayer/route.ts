import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://auth.truelayer.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.TRUELAYER_CLIENT_ID!,
        client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/callback/truelayer`,
      }),
    });

    const tokens = await tokenResponse.json();

    // Store the connection in the database
    await prisma.bankConnection.create({
      data: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      },
    });

    // Redirect back to the dashboard
    return Response.redirect(`${process.env.NEXTAUTH_URL}/trip-monitor`);
  } catch (error) {
    console.error('TrueLayer callback error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 