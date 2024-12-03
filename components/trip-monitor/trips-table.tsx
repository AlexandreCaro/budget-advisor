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
import { Progress } from "@/components/ui/progress"

interface TripsTableProps {
  trips: TripPlan[]
  onViewTrip: (tripId: string) => void
  onEditTrip: (tripId: string) => void
  onDeleteTrip: (tripId: string) => void
}

export function TripsTable({ 
  trips = [],
  onViewTrip, 
  onEditTrip, 
  onDeleteTrip 
}: TripsTableProps) {
  const calculateUtilization = (trip: TripPlan) => {
    const expenses = trip.expenses || [];
    const totalSpent = expenses.reduce((sum, expense) => sum + (expense.spent || 0), 0);
    const utilization = (totalSpent / (trip.overallBudget || 1)) * 100;
    return {
      percentage: Math.min(utilization, 100),
      spent: totalSpent,
      remaining: Math.max(0, (trip.overallBudget || 0) - totalSpent)
    };
  };

  const calculateProjection = (trip: TripPlan) => {
    if (!trip.startDate || !trip.endDate) return null;

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const today = new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (elapsedDays <= 0) return null;

    const expenses = trip.expenses || [];
    const totalSpent = expenses.reduce((sum, expense) => sum + (expense.spent || 0), 0);
    const dailySpend = totalSpent / elapsedDays;
    const projectedTotal = dailySpend * totalDays;
    
    return {
      percentage: (projectedTotal / (trip.overallBudget || 1)) * 100,
      amount: projectedTotal
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Your Trips</h2>
        <Link href="/trip-planner">
          <Button className="bg-green-300 hover:bg-green-400 text-black">
            Plan New Trip
          </Button>
        </Link>
      </div>
      
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip Name</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="w-[300px]">Budget & Utilization</TableHead>
              <TableHead>Projection</TableHead>
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
              trips.map((trip) => {
                const utilization = calculateUtilization(trip);
                const projection = calculateProjection(trip);
                
                return (
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
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            {trip.currency} {utilization.spent.toLocaleString()} / {trip.overallBudget?.toLocaleString()}
                          </span>
                          <span>{utilization.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={utilization.percentage} 
                          className="h-2"
                          indicatorClassName={
                            utilization.percentage > 90 ? "bg-red-500" :
                            utilization.percentage > 75 ? "bg-yellow-500" :
                            "bg-green-500"
                          }
                        />
                        <div className="text-xs text-muted-foreground">
                          Remaining: {trip.currency} {utilization.remaining.toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {projection && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {trip.currency} {projection.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {projection.percentage > 100 ? (
                              <span className="text-red-500">
                                +{(projection.percentage - 100).toFixed(1)}% over budget
                              </span>
                            ) : (
                              <span className="text-green-500">
                                {projection.percentage.toFixed(1)}% of budget
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          trip.status === 'ACTIVE' ? "bg-green-100 text-green-800" :
                          trip.status === 'PLANNED' ? "bg-blue-100 text-blue-800" :
                          trip.status === 'DRAFT' ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onViewTrip(trip.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditTrip(trip.id)}>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 