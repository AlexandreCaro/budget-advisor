import { NextResponse } from 'next/server';
import { getPerplexityEstimates } from '@/lib/cost-estimation/perplexity';

export async function POST(req: Request) {
  try {
    const tripData = await req.json();
    
    console.log('\n=== Perplexity API Request ===');
    console.log('Trip Data:', JSON.stringify(tripData, null, 2));
    
    const apiKey = process.env.PERPLEXITY_API_KEY;
    console.log('API Key available:', !!apiKey);

    const estimates = await getPerplexityEstimates({
      ...tripData,
      onLLMResponse: (category: string, tier: string, response: any) => {
        console.log(`\n=== LLM Response for ${category} (${tier}) ===`);
        console.log(JSON.stringify(response, null, 2));
      }
    });
    
    console.log('\n=== Final Estimates ===');
    Object.entries(estimates).forEach(([category, tiers]) => {
      console.log(`\n${category}:`);
      Object.entries(tiers).forEach(([tier, estimate]) => {
        console.log(`${tier}: $${estimate.min}-$${estimate.max} (${(estimate.confidence * 100).toFixed(1)}%)`);
      });
    });
    
    return NextResponse.json(estimates);
  } catch (error) {
    console.error('\n=== Perplexity API Error ===');
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Failed to get estimates', details: error },
      { status: 500 }
    );
  }
} 