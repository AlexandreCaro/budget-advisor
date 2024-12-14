import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    
    // Check if we're trying to edit a trip
    if (req.nextUrl.pathname.match(/^\/trip-plans\/.*\/edit$/)) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url))
      }

      const tripId = req.nextUrl.pathname.split('/')[2]
      
      // Verify trip ownership
      try {
        const res = await fetch(`${req.nextUrl.origin}/api/trip-plans/${tripId}/verify-owner`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!res.ok) {
          return NextResponse.redirect(new URL("/trip-plans", req.url))
        }
      } catch (error) {
        console.error('Error verifying trip ownership:', error)
        return NextResponse.redirect(new URL("/trip-plans", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/trip-plans/:path*/edit",
    "/trip-plans/new",
  ],
} 