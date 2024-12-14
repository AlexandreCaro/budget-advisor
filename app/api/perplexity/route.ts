import { NextResponse } from 'next/server';
import { getPerplexityEstimates, updateCategoryEstimate } from '@/lib/cost-estimation/perplexity';
import { rateLimiter } from '@/lib/cost-estimation/rate-limiter';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  console.log('\n=== Perplexity API Route Start ===');
  
  try {
    const {
      tripId,
      country,
      startDate,
      endDate,
      travelers,
      currency,
      selectedCategories,
      departureLocation
    } = await req.json();
    
    console.log('[Perplexity Route] Request payload:', JSON.stringify({
      tripId,
      country,
      startDate,
      endDate,
      travelers,
      currency,
      selectedCategories,
      departureLocation
    }, null, 2));

    // Validate required fields
    if (!country || !selectedCategories?.length) {
      console.log('[Perplexity Route] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Test database connection first
    try {
      console.log('[Perplexity Route] Testing database connection...');
      await prisma.$connect();
      console.log('[Perplexity Route] Database connection successful');
    } catch (dbError: any) {
      console.error('[Perplexity Route] Database connection error:', dbError);
      console.error('[Perplexity Route] Database error details:', {
        code: dbError.code,
        message: dbError.message,
        stack: dbError.stack
      });
      return NextResponse.json({
        error: 'Database connection error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }, { status: 503 });
    }

    console.log('[Perplexity Route] Getting estimates for categories:', selectedCategories);

    // Get estimates using rate limiter
    console.log('[Perplexity Route] Scheduling estimate request through rate limiter');
    const estimates = await rateLimiter.schedule(
      () => getPerplexityEstimates({
        tripId,
        country,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        travelers,
        currency,
        selectedCategories,
        departureLocation
      })
    );

    console.log('[Perplexity Route] Received estimates:', JSON.stringify(estimates, null, 2));

    // If we're updating a single category
    if (selectedCategories.length === 1) {
      const categoryKey = selectedCategories[0];
      const categoryEstimate = estimates[categoryKey.toLowerCase()];
      
      if (categoryEstimate) {
        console.log(`[Perplexity Route] Updating estimate for category ${categoryKey}:`, JSON.stringify(categoryEstimate, null, 2));
        try {
          const result = await updateCategoryEstimate(tripId, categoryKey, categoryEstimate);
          console.log(`[Perplexity Route] Category update result:`, JSON.stringify(result, null, 2));
        } catch (updateError) {
          console.error(`[Perplexity Route] Error updating category ${categoryKey}:`, updateError);
          throw updateError;
        }
      } else {
        console.warn(`[Perplexity Route] No estimate found for category ${categoryKey}`);
      }
    }
    
    console.log('[Perplexity Route] Sending response with estimates');
    return NextResponse.json(estimates);
    
  } catch (error: any) {
    console.error('[Perplexity Route] Error:', error);
    console.error('[Perplexity Route] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Handle specific database errors
    if (error?.code === 'P1001') {
      return NextResponse.json({
        error: 'Database connection error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 503 });
    }

    // Handle rate limiter errors
    if (error.message?.includes('rate limit')) {
      return NextResponse.json({
        error: 'Too many requests. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 429 });
    }

    return NextResponse.json({
      error: 'Failed to generate estimates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  } finally {
    console.log('[Perplexity Route] Disconnecting from database');
    await prisma.$disconnect();
    console.log('\n=== Perplexity API Route End ===');
  }
} 