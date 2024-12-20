'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TripPlan } from "@/types/trip"
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useState } from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { BudgetAllocationPreview } from "@/components/trip-planner/budget-allocation-preview"
import TripPlannerWizard from "@/components/TripPlannerWizard"
import { useRouter } from 'next/navigation'

interface TripDashboardProps {
  trip: TripPlan
  onBack: () => void
  onDelete: (tripId: string) => void
}

const categoryColors = {
  flight: "#F87171",
  accommodation: "#FB923C",
  localTransportation: "#FBBF24",
  food: "#A3E635",
  activities: "#4ADE80",
  shopping: "#2DD4BF",
  carRental: "#22D3EE",
} as const

export function TripDashboard({ trip, onBack, onDelete }: TripDashboardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBudgetEditor, setShowBudgetEditor] = useState(false)
  const router = useRouter()

  const expenses = trip.expenses || []

  const totalSpent = expenses.reduce((acc, exp) => acc + (exp.spent || 0), 0)
  const spendingPercentage = (totalSpent / (trip.overallBudget ?? 0)) * 100
  const isOverspent = spendingPercentage > 100

  // Example daily spending data - replace with actual data
  const dailyData = [
    { date: 'Day 1', flight: 500, accommodation: 200, food: 100 },
    { date: 'Day 2', accommodation: 200, food: 150, activities: 80 },
    { date: 'Day 3', accommodation: 200, food: 120, shopping: 200 },
    // Add more days as needed
  ]

  // Example category spending data
  const categoryData = expenses.map(expense => ({
    name: expense.name,
    budget: (trip.overallBudget ?? 0) * ((expense.budgetValue || 0) / 100),
    spent: expense.spent || 0,
    remaining: (trip.overallBudget ?? 0) * ((expense.budgetValue || 0) / 100) - (expense.spent || 0),
  }))

  // Add proper tracking handlers
  const handleTrackingChange = async (categoryKey: string, isTracked: boolean) => {
    try {
      const response = await fetch(`/api/trip-plans/${trip.id}/expenses/${categoryKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTracked }),
      })
      
      if (!response.ok) throw new Error('Failed to update tracking')
    } catch (error) {
      console.error('Error updating tracking:', error)
    }
  }

  // Add handler for expense updates
  const handleExpenseUpdate = async (key: string, updates: Partial<TripExpenseCategory>) => {
    try {
      const response = await fetch(`/api/trip-plans/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: trip.expenses.map(expense => 
            expense.key === key 
              ? { ...expense, ...updates }
              : expense
          )
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update expense');
      }

      // Refresh trip data after update
      // You might want to add a callback to refresh the parent component
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  // Modify the handleEditBudget function
  const handleEditBudget = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>
                Back to Trips
              </Button>
              <Button variant="outline" onClick={() => router.push('/trip-monitor')}>
                Open Monitor
              </Button>
            </div>
          </div>
        </div>

        <BudgetAllocationPreview
          selectedCategories={trip.selectedCategories}
          expenses={trip.expenses}
          currency={trip.currency}
          overallBudget={trip.overallBudget}
          onExpenseUpdate={handleExpenseUpdate}
        />
      </div>
    );
  };

  // When Edit Budget button is clicked, show step 4 of TripPlannerWizard
  if (showBudgetEditor) {
    return (
      <TripPlannerWizard
        initialData={{
          ...trip,
          step: 4 // Force wizard to start at step 4
        }}
        onBack={() => setShowBudgetEditor(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onBack}
            >
              Back to Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowBudgetEditor(true)}
            >
              Edit Allocation
            </Button>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{trip.name}</h2>
            <p className="text-muted-foreground">{trip.country}</p>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete Trip
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your trip plan
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(trip.id)
                setShowDeleteDialog(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.currency} {(trip.overallBudget ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.currency} {totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {spendingPercentage.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.currency} {(totalSpent / dailyData.length).toFixed(0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {totalSpent / dailyData.length > (trip.overallBudget ?? 0) / dailyData.length ? (
                <TrendingUp className="mr-1 h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-green-500" />
              )}
              vs. {trip.currency} {((trip.overallBudget ?? 0) / dailyData.length).toFixed(0)} target
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.currency} {(trip.overallBudget ?? 0 - totalSpent).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {dailyData.length} days remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Budget Category Breakdown</CardTitle>
              <Button onClick={() => setShowBudgetEditor(true)}>
                Edit Budget Allocation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {expenses.map((expense) => (
              <div key={expense.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: categoryColors[expense.key as keyof typeof categoryColors] }}
                    />
                    <span className="font-medium">{expense.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch 
                      checked={expense.isTracked}
                      onCheckedChange={(checked) => handleTrackingChange(expense.key, checked)}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleEditBudget(expense.key)}>
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Budget: {trip.currency} {((trip.overallBudget ?? 0) * (expense.budgetValue || 0) / 100).toLocaleString()}</span>
                    <span>{expense.budgetValue || 0}%</span>
                  </div>
                  <Progress value={((expense.spent || 0) / ((trip.overallBudget ?? 0) * (expense.budgetValue || 0) / 100)) * 100} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Spent: {trip.currency} {(expense.spent || 0).toLocaleString()}</span>
                    <span>{(((expense.spent || 0) / ((trip.overallBudget ?? 0) * (expense.budgetValue || 0) / 100)) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.entries(categoryColors).map(([category, color]) => (
                  <Bar 
                    key={category}
                    dataKey={category}
                    stackId="a"
                    fill={color}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 