import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] gap-6 py-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Plan Your Trip with ChipTrip
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground">
          Your personal budget advisor for travel planning and expense tracking
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/trip-planner">
          <Button size="lg">
            Start Planning
          </Button>
        </Link>
        <Link href="/auth/signin">
          <Button variant="outline" size="lg">
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  )
}

