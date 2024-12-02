'use client'

import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { TripPlan } from "@/types/trip"

interface TripsTableProps {
  trips: TripPlan[]
  onViewTrip: (tripId: string) => void
  onEditTrip: (tripId: string) => void
  onDeleteTrip: (tripId: string) => void
}

export function TripsTable({ trips, onViewTrip, onEditTrip, onDeleteTrip }: TripsTableProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Your Trips</h2>
        <Link href="/trip-planner">
          <Button>Plan New Trip</Button>
        </Link>
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
            {trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No trips found. Start by planning a new trip!
                </TableCell>
              </TableRow>
            ) : (
              trips.map((trip) => (
                <TableRow 
                  key={trip.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewTrip(trip.id)}
                >
                  <TableCell className="font-medium">{trip.name}</TableCell>
                  <TableCell>{trip.country}</TableCell>
                  <TableCell>
                    {trip.startDate && trip.endDate ? (
                      <>
                        {format(new Date(trip.startDate), "MMM d")} -{" "}
                        {format(new Date(trip.endDate), "MMM d, yyyy")}
                      </>
                    ) : (
                      "Dates not set"
                    )}
                  </TableCell>
                  <TableCell>
                    {trip.currency} {trip.overallBudget?.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {trip.expenses.map((expense) => (
                        <Badge
                          key={expense.key}
                          variant="secondary"
                          className="text-xs"
                        >
                          {expense.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(trip.status)}>
                      {trip.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewTrip(trip.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditTrip(trip.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteTrip(trip.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 