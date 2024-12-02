'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { TripPlannerWizard } from "@/components/TripPlannerWizard"

export default function TripPlannerPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin')
    },
  })

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <TripPlannerWizard />
} 