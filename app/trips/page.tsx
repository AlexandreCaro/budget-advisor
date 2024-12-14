'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TripPlan } from '@/types/trip';
import { Skeleton } from '@/components/ui/skeleton';
import { TripsTable } from '@/components/trip-monitor/trips-table';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

export default function TripsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    },
  });
  
  const [trips, setTrips] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      console.log('Fetching trips...');
      const response = await fetch('/api/trip-plans', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', {
        tripsCount: data.length,
        firstTrip: data[0] ? {
          id: data[0].id,
          name: data[0].name,
          expensesCount: data[0].expenses?.length
        } : null
      });
      
      const parsedTrips = data.map((trip: any) => ({
        ...trip,
        startDate: trip.startDate ? new Date(trip.startDate) : null,
        endDate: trip.endDate ? new Date(trip.endDate) : null,
        createdAt: new Date(trip.createdAt),
        updatedAt: new Date(trip.updatedAt),
        expenses: (trip.expenses || []).map((expense: any) => ({
          ...expense,
          createdAt: new Date(expense.createdAt),
          updatedAt: new Date(expense.updatedAt)
        }))
      }));
      
      setTrips(parsedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch trips');
      toast({
        title: "Error",
        description: "Failed to load trips",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchTrips();
    }
  }, [session, status]);

  const handleViewTrip = (tripId: string) => {
    router.push(`/trip-monitor/${tripId}`);
  };

  const handleEditTrip = (tripId: string) => {
    router.push(`/trip-planner/${tripId}`);
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const response = await fetch(`/api/trip-plans/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trip');
      }

      toast({
        title: "Success",
        description: "Trip deleted successfully",
      });

      // Refresh trips list
      fetchTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: "Failed to delete trip",
        variant: "destructive"
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading trips: {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4">
        Please sign in to view your trips.
      </div>
    );
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
  );
} 