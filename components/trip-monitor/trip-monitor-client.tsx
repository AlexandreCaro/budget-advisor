"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

interface TripMonitorClientProps {
  initialTrips: Array<{
    id: string
    name: string
    status: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'CLOSED'
    country: string
    startDate: string
    endDate: string
    currency: string
    overallBudget: number
    selectedCategories: string[]
  }>
}

export function TripMonitorClient({ initialTrips }: TripMonitorClientProps) {
  const [trips, setTrips] = useState(initialTrips)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async (tripId: string) => {
    try {
      const response = await fetch(`/api/trip-plans/${tripId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete trip')
      }

      setTrips(trips.filter(trip => trip.id !== tripId))
      toast({
        title: "Trip deleted",
        description: "The trip has been successfully deleted.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete trip. Please try again.",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800'
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Trips</h1>
        <Button onClick={() => router.push('/trip-planner')}>
          Plan New Trip
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip Name</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((trip) => (
              <TableRow key={trip.id}>
                <TableCell className="font-medium">{trip.name}</TableCell>
                <TableCell>{trip.country}</TableCell>
                <TableCell>
                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{formatCurrency(trip.overallBudget, trip.currency)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {trip.selectedCategories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(trip.status)}>
                    {trip.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/trip-monitor/${trip.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/trip-planner/${trip.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(trip.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 