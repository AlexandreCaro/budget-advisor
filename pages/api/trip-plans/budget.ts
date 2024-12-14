import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!['POST', 'PATCH'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Received budget adjustment request:', req.body);
    const { tripId, budget, expenses } = req.body;

    if (!tripId) {
      return res.status(400).json({ 
        message: 'Missing tripId',
        received: { tripId, budget, expenses }
      });
    }

    if (!budget || isNaN(budget) || budget <= 0) {
      return res.status(400).json({ 
        message: 'Invalid budget value',
        received: { budget }
      });
    }

    if (!Array.isArray(expenses)) {
      return res.status(400).json({ 
        message: 'Invalid expenses data',
        received: { expenses }
      });
    }

    const updatedTrip = await prisma.tripPlan.update({
      where: { id: tripId },
      data: {
        overallBudget: budget,
        expenses: {
          updateMany: expenses.map(exp => ({
            where: { key: exp.key },
            data: {
              budgetValue: exp.budgetValue,
              selectedTier: exp.selectedTier
            }
          }))
        }
      },
      include: {
        expenses: true
      }
    });

    console.log('Trip updated successfully:', updatedTrip);
    return res.status(200).json(updatedTrip);

  } catch (error) {
    console.error('Budget adjustment error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to update budget',
      error: error instanceof Error ? error.toString() : 'Unknown error'
    });
  }
} 