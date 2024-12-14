import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { TripStatus } from '@prisma/client';
import type { ExpenseCategory } from '@prisma/client';

interface UpdateData {
  name?: string;
  country?: string;
  city?: any;
  cities?: any[];
  startDate?: Date;
  endDate?: Date;
  travelers?: number;
  currency?: string;
  overallBudget?: number;
  selectedCategories?: string[];
  status?: TripStatus;
  departureLocation?: {
    create?: {
      lat: number;
      lng: number;
      name: string;
    };
    update?: {
      lat: number;
      lng: number;
      name: string;
    };
  };
}

// Add validation functions at the top
function isValidNumber(value: any): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

function validateBudgetData(data: any) {
  const errors: string[] = [];

  // Validate overall budget
  if (data.overallBudget !== undefined) {
    if (!isValidNumber(data.overallBudget)) {
      errors.push('Overall budget must be a valid positive number');
    }
  }

  // Validate expenses
  if (data.expenses) {
    data.expenses.forEach((expense: any, index: number) => {
      if (expense.budgetValue !== undefined && !isValidNumber(expense.budgetValue)) {
        errors.push(`Invalid budget value for expense at index ${index}`);
      }
      if (expense.cost !== undefined && expense.cost !== null && !isValidNumber(expense.cost)) {
        errors.push(`Invalid cost value for expense at index ${index}`);
      }
    });
  }

  return errors;
}

// Add type for expense
interface ExpenseUpdate {
  name: string;
  key: string;
  budgetType: string;
  budgetValue: number;
  preBooked: boolean;
  cost?: number | null;
  defaultPercentage: number;
  selectedTier: string;
  estimates?: any;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();
    
    // Log incoming update data
    console.log('Trip plan update request:', {
      tripId: id,
      updates: {
        departureLocation: data.departureLocation,
        city: data.city,
        cities: data.cities,
        // Log other critical fields
        status: data.status,
        selectedCategories: data.selectedCategories,
        expenses: data.expenses?.length
      }
    });

    // Validate budget data
    const validationErrors = validateBudgetData(data);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors 
        }, 
        { status: 400 }
      );
    }

    // Verify ownership
    const tripPlan = await prisma.tripPlan.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!tripPlan || tripPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: UpdateData = {};

    // Handle basic fields
    if (data.name) updateData.name = data.name;
    if (data.country) updateData.country = data.country;
    if (data.city) updateData.city = data.city;
    if (data.cities) updateData.cities = data.cities;
    
    // Ensure selectedCategories is always an array
    if (data.selectedCategories) {
      updateData.selectedCategories = Array.isArray(data.selectedCategories) 
        ? data.selectedCategories 
        : [];
    }

    // Handle departure location
    if (data.departureLocation) {
      const departureLocationData = {
        lat: data.departureLocation.lat,
        lng: data.departureLocation.lng,
        name: data.departureLocation.city || 'Unknown Location',
        code: data.departureLocation.code,
        airport: data.departureLocation.airport
      };

      const existingLocation = await prisma.departureLocation.findUnique({
        where: { tripPlanId: id }
      });

      if (existingLocation) {
        await prisma.departureLocation.update({
          where: { tripPlanId: id },
          data: departureLocationData
        });
      } else {
        await prisma.departureLocation.create({
          data: {
            ...departureLocationData,
            tripPlanId: id
          }
        });
      }
    }

    // Handle expenses with validation
    if (data.expenses) {
      const validatedExpenses = data.expenses.map((expense: ExpenseUpdate) => ({
        ...expense,
        budgetValue: Math.max(0, parseFloat(expense.budgetValue || '0')),
        cost: expense.cost ? Math.max(0, parseFloat(expense.cost)) : null
      }));

      // Update expenses with validated values
      await Promise.all(
        validatedExpenses.map(expense => 
          prisma.expenseCategory.upsert({
            where: {
              tripPlanId_key: {
                tripPlanId: id,
                key: expense.key
              }
            },
            create: {
              tripPlanId: id,
              name: expense.name,
              key: expense.key,
              budgetType: expense.budgetType || 'percentage',
              budgetValue: expense.budgetValue,
              preBooked: expense.preBooked || false,
              cost: expense.cost,
              defaultPercentage: expense.defaultPercentage || 0,
              selectedTier: expense.selectedTier || 'medium',
              estimates: expense.estimates || null
            },
            update: {
              budgetValue: expense.budgetValue,
              cost: expense.cost,
              preBooked: expense.preBooked || false,
              selectedTier: expense.selectedTier || 'medium'
            }
          })
        )
      );
    }

    // Update trip plan
    const updatedPlan = await prisma.tripPlan.update({
      where: { id },
      data: {
        ...updateData,
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.travelers && { travelers: parseInt(data.travelers.toString()) }),
        ...(data.currency && { currency: data.currency }),
        ...(data.overallBudget && { 
          overallBudget: parseFloat(data.overallBudget.toString()) 
        }),
        selectedCategories: data.selectedCategories || [],  // Ensure this is always set
      },
      include: {
        expenses: true,
        departureLocation: true
      }
    });

    // Log the saved categories for debugging
    console.log('Saved categories:', {
      tripId: updatedPlan.id,
      selectedCategories: updatedPlan.selectedCategories,
      expenseCount: updatedPlan.expenses?.length
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Failed to update trip plan:', {
      tripId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to update trip plan' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const tripPlan = await prisma.tripPlan.findUnique({
      where: { 
        id,
        userId: session.user.id
      },
      include: {
        expenses: true,
        departureLocation: true
      }
    });

    if (!tripPlan) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(tripPlan);
  } catch (error) {
    console.error('Error fetching trip plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip plan' },
      { status: 500 }
    );
  }
} 