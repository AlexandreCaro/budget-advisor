'use client'

import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { TripsTable } from "@/components/trip-monitor/trips-table"
import { TripDashboard } from "@/components/trip-monitor/trip-dashboard"
import { TripPlannerWizard } from "@/components/TripPlannerWizard"
import { TripPlan } from "@/types/trip"

export default function TripMonitorPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin')
    },
  })

  const router = useRouter()
  const [trips, setTrips] = useState<TripPlan[]>([])
  const [selectedTrip, setSelectedTrip] = useState<TripPlan | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrips = async () => {
      if (!session?.user?.id) return;

      try {
        console.log('Fetching trips...');
        const response = await fetch('/api/trip-plans', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched trips:', data);
        setTrips(data);
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchTrips();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const tripId = new URLSearchParams(window.location.search).get('id')
    if (tripId && trips.length > 0) {
      const trip = trips.find(t => t.id === tripId)
      if (trip) {
        setSelectedTrip(trip)
        setIsEditing(false)
      }
    }
  }, [trips])

  useEffect(() => {
    if (selectedTrip) {
      router.push(`/trip-monitor?id=${selectedTrip.id}`)
    } else {
      router.push('/trip-monitor')
    }
  }, [selectedTrip, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const handleViewTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId)
    if (trip) {
      setSelectedTrip(trip)
      setIsEditing(false)
    }
  }

  const handleEditTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId)
    if (trip) {
      setSelectedTrip(trip)
      setIsEditing(true)
    }
  }

  const handleBackFromEdit = () => {
    setIsEditing(false)
    // Refresh trip data
    const tripId = selectedTrip?.id
    if (tripId) {
      fetch(`/api/trip-plans/${tripId}`)
        .then(res => res.json())
        .then(data => {
          setTrips(prev => prev.map(t => t.id === tripId ? data : t))
          setSelectedTrip(data)
        })
        .catch(console.error)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/trip-plans/${tripId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete trip')
      }

      setTrips(prev => prev.filter(trip => trip.id !== tripId))
      setSelectedTrip(null)
    } catch (error) {
      console.error('Error deleting trip:', error)
    }
  }

  if (isEditing && selectedTrip) {
    return <TripPlannerWizard 
      initialData={selectedTrip} 
      onBack={handleBackFromEdit}
    />
  }

  if (selectedTrip) {
    return (
      <TripDashboard 
        trip={selectedTrip} 
        onBack={() => setSelectedTrip(null)}
        onDelete={handleDeleteTrip}
      />
    )
  }

  return (
    <div className="container mx-auto py-6">
      <TripsTable 
        trips={trips} 
        onViewTrip={handleViewTrip} 
        onEditTrip={handleEditTrip} 
        onDeleteTrip={handleDeleteTrip}
      />
    </div>
  )
} 