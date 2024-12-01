import { TripPlannerWizard } from '@/components/TripPlannerWizard'

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trip Budget Planner</h1>
      <TripPlannerWizard />
    </div>
  )
}

