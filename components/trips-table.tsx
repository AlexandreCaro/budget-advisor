"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Icons } from '@/components/ui/icons'

interface Trip {
  id: string
  name: string
  country: string
  startDate: string
  endDate: string
  status: string
}

export function TripsTable() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = useCallback(async () => {
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
      console.log('Trips fetched:', data);
      setTrips(data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch trips');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load trips"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleEdit = useCallback(async (tripId: string) => {
    try {
      if (!session?.user) {
        toast({
          title: "Session expired",
          description: "Please sign in to edit trips.",
          variant: "destructive"
        });
        return;
      }

      router.push(`/trip-plans/${tripId}/edit`);
    } catch (error) {
      console.error('Error handling edit:', error);
      toast({
        title: "Error",
        description: "Failed to edit trip. Please try again.",
        variant: "destructive"
      });
    }
  }, [router, session, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <Button 
          onClick={() => fetchTrips()} 
          variant="outline" 
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!trips.length) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No trips found</p>
        <Button 
          onClick={() => router.push('/trip-planner')} 
          className="mt-4"
        >
          Create Trip
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((trip) => (
            <TableRow key={trip.id}>
              <TableCell>{trip.name}</TableCell>
              <TableCell>{trip.country}</TableCell>
              <TableCell>
                {trip.startDate ? format(new Date(trip.startDate), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>
                {trip.endDate ? format(new Date(trip.endDate), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>{trip.status}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleEdit(trip.id)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 