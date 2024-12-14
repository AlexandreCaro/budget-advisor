import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';

const API_URL = 'https://api.perplexity.ai/chat/completions';

// Add these exports that components need
export const DEFAULT_EXPENSE_CATEGORIES = [
  { key: 'flight', name: 'Flight', defaultPercentage: 30 },
  { key: 'accommodation', name: 'Accommodation', defaultPercentage: 30 },
  { key: 'localTransportation', name: 'Local Transportation', defaultPercentage: 10 },
  { key: 'food', name: 'Food', defaultPercentage: 15 },
  { key: 'activities', name: 'Activities', defaultPercentage: 10 },
  { key: 'shopping', name: 'Shopping', defaultPercentage: 5 }
] as const;

export const CATEGORY_TIER_PRICES = {
  flight: {
    budget: { min: 200, max: 400, average: 300 },
    medium: { min: 400, max: 800, average: 600 },
    premium: { min: 800, max: 2000, average: 1400 }
  },
  accommodation: {
    budget: { min: 30, max: 80, average: 50 },
    medium: { min: 80, max: 200, average: 140 },
    premium: { min: 200, max: 1000, average: 400 }
  },
  localTransportation: {
    budget: { min: 5, max: 15, average: 10 },
    medium: { min: 15, max: 50, average: 30 },
    premium: { min: 50, max: 200, average: 100 }
  },
  food: {
    budget: { min: 20, max: 40, average: 30 },
    medium: { min: 40, max: 100, average: 70 },
    premium: { min: 100, max: 300, average: 200 }
  },
  activities: {
    budget: { min: 10, max: 30, average: 20 },
    medium: { min: 30, max: 100, average: 60 },
    premium: { min: 100, max: 500, average: 250 }
  },
  shopping: {
    budget: { min: 50, max: 200, average: 100 },
    medium: { min: 200, max: 500, average: 350 },
    premium: { min: 500, max: 2000, average: 1000 }
  }
} as const;

interface TierEstimate {
  min: number;
  max: number;
  average: number;
  confidence: number;
  source: string;
  references: string[];
}

interface GetEstimatesParams {
  tripId?: string;
  country: string;
  startDate: Date;
  endDate: Date;
  travelers: string | number;
  currency: string;
  selectedCategories: string[];
  departureLocation?: {
    name: string;
    code?: string;
    outboundDate?: Date;
    inboundDate?: Date;
    isRoundTrip?: boolean;
    route?: {
      outbound: string[];
      inbound?: string[];
    };
  };
}

// Add error type interface
interface PerplexityError extends Error {
  code?: string;
  name: string;
  message: string;
  stack?: string;
}

// Simple API request function
async function makePerplexityRequest(prompt: string): Promise<any> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('Missing Perplexity API key');

  console.log('[Perplexity API] Starting request');
  console.log('[Perplexity API] Prompt:', prompt);

  const requestBody = {
    model: "llama-3.1-sonar-huge-128k-online",
    messages: [{ role: "user", content: prompt }]
  };

  console.log('[Perplexity API] Request body:', JSON.stringify(requestBody, null, 2));

  try {
    console.log('[Perplexity API] Sending request...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Perplexity API] Response status:', response.status);
    console.log('[Perplexity API] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity API] Error response:', errorText);
      console.error('[Perplexity API] Error status:', response.status);
      console.error('[Perplexity API] Error statusText:', response.statusText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Perplexity API] Raw response:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[Perplexity API] No content in response');
      throw new Error('No content in response');
    }

    console.log('[Perplexity API] Content:', content);

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    console.log('[Perplexity API] Extracted JSON string:', jsonStr);
    
    try {
      const parsed = JSON.parse(jsonStr.trim());
      console.log('[Perplexity API] Parsed JSON:', JSON.stringify(parsed, null, 2));
      
      const normalized = normalizeEstimateKeys(parsed);
      console.log('[Perplexity API] Normalized estimates:', JSON.stringify(normalized, null, 2));
      
      return normalized;
    } catch (parseError) {
      console.error('[Perplexity API] JSON parse error:', parseError);
      console.error('[Perplexity API] Failed to parse string:', jsonStr);
      throw new Error('Invalid JSON response from API');
    }
  } catch (error) {
    const perplexityError = error as PerplexityError;
    console.error('[Perplexity API] Request error:', perplexityError);
    console.error('[Perplexity API] Error details:', {
      name: perplexityError.name,
      message: perplexityError.message,
      stack: perplexityError.stack
    });
    throw perplexityError;
  }
}

// Helper function to normalize estimate keys to lowercase
function normalizeEstimateKeys(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(normalizeEstimateKeys);
  }

  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase();
    if (typeof value === 'object' && value !== null) {
      normalized[normalizedKey] = normalizeEstimateKeys(value);
    } else {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

// Generate prompt for general estimates
function generateGeneralPrompt(params: GetEstimatesParams): string {
  return `Search for current daily costs in ${params.country} for ${params.travelers} travelers.
  Return ONLY a JSON object with estimates for these categories: ${params.selectedCategories.join(', ')}
  
  Use this format:
  {
    "category": {
      "budget": {
        "min": number,
        "max": number,
        "average": number,
        "confidence": number,
        "source": string,
        "references": array of strings
      },
      "medium": { same structure },
      "premium": { same structure }
    }
  }

  All costs in ${params.currency} per day.
  Numbers must be valid numbers, not strings.
  Confidence between 0 and 1.
  Include 2+ references per category/tier.`;
}

// Generate prompt for flight estimates
function generateFlightPrompt(params: GetEstimatesParams): string {
  const { departureLocation } = params;
  
  // Format route information if available
  const routeInfo = departureLocation?.route 
    ? `\nOutbound route: ${departureLocation.route.outbound.join(' → ')}${
        departureLocation.route.inbound 
          ? '\nReturn route: ' + departureLocation.route.inbound.join(' → ')
          : ''
      }`
    : '';

  // Format dates
  const dateInfo = `\nOutbound date: ${departureLocation?.outboundDate?.toISOString().split('T')[0] || params.startDate.toISOString().split('T')[0]}${
    departureLocation?.inboundDate 
      ? '\nReturn date: ' + departureLocation.inboundDate.toISOString().split('T')[0]
      : '\nReturn date: ' + params.endDate.toISOString().split('T')[0]
  }`;

  return `Search for round-trip flight costs 
  from ${departureLocation?.name}${departureLocation?.code ? ` (${departureLocation.code})` : ''} 
  to ${params.country}.${routeInfo}${dateInfo}
  Number of travelers: ${params.travelers}

  Return ONLY a JSON object with flight estimates in this format:
  {
    "flight": {
      "budget": {
        "min": number (total cost for round-trip),
        "max": number (total cost for round-trip),
        "average": number (total cost for round-trip),
        "confidence": number,
        "source": string,
        "references": array of strings with specific airline and route options including:
          - Outbound flight details (airline, route, times)
          - Return flight details (airline, route, times)
          - Total round-trip price
          - Booking link if available
      },
      "medium": { same structure },
      "premium": { same structure }
    }
  }
  
  All costs in ${params.currency} for TOTAL round-trip price per person.
  Numbers must be valid numbers, not strings.
  Confidence between 0 and 1.
  Include specific airline references with both outbound and return flight details.
  Consider peak/off-peak pricing for the given dates.
  For budget tier: consider low-cost carriers and longer layovers.
  For medium tier: consider major airlines with reasonable layovers.
  For premium tier: consider direct flights and business class options.
  Include booking links to airline websites or travel search engines where possible.`;
}

// Main estimation function
export async function getPerplexityEstimates(params: GetEstimatesParams): Promise<any> {
  try {
    console.log('[Perplexity] Getting estimates with params:', params);
    let estimates: any = {};
    
    // If we're only updating a single category
    if (params.selectedCategories.length === 1) {
      const categoryKey = params.selectedCategories[0].toLowerCase();
      console.log(`[Perplexity] Getting single category estimate for: ${categoryKey}`);

      if (categoryKey === 'flight' && params.departureLocation) {
        // Handle flight estimates
        const flightPrompt = generateFlightPrompt(params);
        console.log('[Perplexity] Flight prompt:', flightPrompt);
        const flightResponse = await makePerplexityRequest(flightPrompt);
        if (flightResponse.flight) {
          estimates.flight = flightResponse.flight;
        }
      } else {
        // Handle other single category estimates
        const categoryPrompt = generateCategoryPrompt(params, categoryKey);
        console.log('[Perplexity] Category prompt:', categoryPrompt);
        const response = await makePerplexityRequest(categoryPrompt);
        estimates = response;
      }
    } else {
      // Handle multiple categories
      const categoryPromises = [];

      // Handle flight estimates separately if needed
      if (params.departureLocation && params.selectedCategories.includes('flight')) {
        const flightPrompt = generateFlightPrompt(params);
        console.log('[Perplexity] Flight prompt:', flightPrompt);
        categoryPromises.push(
          makePerplexityRequest(flightPrompt)
            .then(response => {
              if (response.flight) {
                estimates.flight = response.flight;
              }
            })
        );
      }

      // Handle other categories
      const otherCategories = params.selectedCategories.filter(cat => cat !== 'flight' || !params.departureLocation);
      if (otherCategories.length > 0) {
        const generalPrompt = generateGeneralPrompt({ ...params, selectedCategories: otherCategories });
        console.log('[Perplexity] General prompt:', generalPrompt);
        categoryPromises.push(
          makePerplexityRequest(generalPrompt)
            .then(response => {
              estimates = { ...estimates, ...response };
            })
        );
      }

      // Wait for all category estimates
      await Promise.all(categoryPromises);
    }

    // Validate and normalize estimates
    const normalizedEstimates: Record<string, any> = {};
    for (const category of params.selectedCategories) {
      const key = category.toLowerCase();
      const estimate = estimates[key];
      
      if (estimate) {
        normalizedEstimates[key] = {
          budget: {
            min: Number(estimate.budget?.min || estimate.budget?.minimum || 0),
            max: Number(estimate.budget?.max || estimate.budget?.maximum || 0),
            average: Number(estimate.budget?.average || estimate.budget?.avg || 0),
            confidence: Number(estimate.budget?.confidence || 1),
            source: String(estimate.budget?.source || 'perplexity'),
            references: Array.isArray(estimate.budget?.references) ? estimate.budget.references : []
          },
          medium: {
            min: Number(estimate.medium?.min || estimate.medium?.minimum || 0),
            max: Number(estimate.medium?.max || estimate.medium?.maximum || 0),
            average: Number(estimate.medium?.average || estimate.medium?.avg || 0),
            confidence: Number(estimate.medium?.confidence || 1),
            source: String(estimate.medium?.source || 'perplexity'),
            references: Array.isArray(estimate.medium?.references) ? estimate.medium.references : []
          },
          premium: {
            min: Number(estimate.premium?.min || estimate.premium?.minimum || 0),
            max: Number(estimate.premium?.max || estimate.premium?.maximum || 0),
            average: Number(estimate.premium?.average || estimate.premium?.avg || 0),
            confidence: Number(estimate.premium?.confidence || 1),
            source: String(estimate.premium?.source || 'perplexity'),
            references: Array.isArray(estimate.premium?.references) ? estimate.premium.references : []
          }
        };
      } else {
        console.warn(`[Perplexity] No estimate found for category: ${key}`);
        // Use default estimates from CATEGORY_TIER_PRICES
        normalizedEstimates[key] = {
          budget: {
            ...CATEGORY_TIER_PRICES[key as keyof typeof CATEGORY_TIER_PRICES]?.budget,
            confidence: 0.7,
            source: 'default',
            references: []
          },
          medium: {
            ...CATEGORY_TIER_PRICES[key as keyof typeof CATEGORY_TIER_PRICES]?.medium,
            confidence: 0.7,
            source: 'default',
            references: []
          },
          premium: {
            ...CATEGORY_TIER_PRICES[key as keyof typeof CATEGORY_TIER_PRICES]?.premium,
            confidence: 0.7,
            source: 'default',
            references: []
          }
        };
      }
    }

    console.log('[Perplexity] Final normalized estimates:', normalizedEstimates);

    // Store estimates in history if tripId is provided
    if (params.tripId) {
      try {
        await storeEstimateHistory(params, normalizedEstimates);
      } catch (error) {
        console.error('[Perplexity] Error storing estimates in history:', error);
      }
    }

    return normalizedEstimates;
  } catch (error) {
    console.error('[Perplexity] Error getting estimates:', error);
    throw error;
  }
}

// Store estimates in history
async function storeEstimateHistory(params: GetEstimatesParams, estimates: any) {
  if (!params.tripId) return;

  try {
    const entries = [];
    
    for (const [category, categoryData] of Object.entries(estimates)) {
      if (!categoryData || typeof categoryData !== 'object') continue;

      for (const [tier, tierData] of Object.entries(categoryData as Record<string, any>)) {
        if (!tierData || typeof tierData !== 'object') continue;

        const minCost = Number(tierData.min ?? tierData.minimum ?? 0);
        const maxCost = Number(tierData.max ?? tierData.maximum ?? 0);
        const avgCost = Number(tierData.avg ?? tierData.average ?? 0);
        const confidence = Number(tierData.confidence ?? 1.0);

        if (minCost || maxCost || avgCost) {
          entries.push({
            tripPlanId: params.tripId,
            category: category.toLowerCase(),
            country: params.country,
            travelers: String(params.travelers),
            minCost,
            maxCost,
            avgCost,
            confidence,
            source: String(tierData.source ?? 'perplexity')
          });
        }
      }
    }

    if (entries.length > 0) {
      await Promise.all(
        entries.map(entry => 
          prisma.estimateHistory.create({
            data: entry
          })
        )
      );
    }
  } catch (error) {
    throw error;
  }
}

// Add this function to handle single category estimate updates
export async function updateCategoryEstimate(
  tripId: string,
  categoryKey: string,
  estimate: any
) {
  try {
    console.log('[Perplexity] Starting category estimate update:', {
      tripId,
      categoryKey,
      estimate: JSON.stringify(estimate, null, 2)
    });

    // Validate inputs
    if (!tripId || !categoryKey || !estimate) {
      console.error('[Perplexity] Missing required parameters:', { tripId, categoryKey, estimate });
      throw new Error('Missing required parameters for estimate update');
    }

    console.log('[Perplexity] Attempting database upsert...');
    
    // Use the correct model name from your Prisma schema
    const result = await prisma.estimate_history.upsert({
      where: {
        tripPlanId_category: {
          tripPlanId: tripId,
          category: categoryKey
        }
      },
      update: {
        estimates: estimate
      },
      create: {
        tripPlanId: tripId,
        category: categoryKey,
        estimates: estimate
      }
    });

    console.log('[Perplexity] Database upsert successful:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    const perplexityError = error as PerplexityError;
    console.error(`[Perplexity] Error updating estimate for category ${categoryKey}:`, perplexityError);
    console.error('[Perplexity] Error details:', {
      name: perplexityError.name,
      message: perplexityError.message,
      code: perplexityError.code,
      stack: perplexityError.stack
    });
    throw perplexityError;
  }
}

// Add new function for single category prompts
function generateCategoryPrompt(params: GetEstimatesParams, category: string): string {
  return `Search for current costs in ${params.country} for ${params.travelers} travelers.
  Return ONLY a JSON object with estimates for the ${category} category.
  
  Use this format:
  {
    "${category}": {
      "budget": {
        "min": number,
        "max": number,
        "average": number,
        "confidence": number,
        "source": string,
        "references": array of strings with specific options and details
      },
      "medium": { same structure },
      "premium": { same structure }
    }
  }

  All costs in ${params.currency}${category !== 'flight' ? ' per day' : ''}.
  Numbers must be valid numbers, not strings.
  Confidence between 0 and 1.
  Include detailed references with specific options.
  Consider local prices and seasonal variations.
  For ${category}, consider:
  ${getCategorySpecificGuidelines(category)}`;
}

// Add helper function for category-specific guidelines
function getCategorySpecificGuidelines(category: string): string {
  const guidelines: Record<string, string> = {
    accommodation: `
    - Budget: hostels, shared rooms, basic hotels
    - Medium: 3-star hotels, private apartments
    - Premium: 4-5 star hotels, luxury accommodations
    Include specific hotel names and booking platforms in references.`,
    
    food: `
    - Budget: street food, local markets, self-catering
    - Medium: mid-range restaurants, mix of dining out and self-catering
    - Premium: high-end restaurants, fine dining
    Include specific restaurant recommendations and local food markets.`,
    
    activities: `
    - Budget: free attractions, walking tours, public spaces
    - Medium: paid attractions, guided tours, museums
    - Premium: private tours, exclusive experiences
    Include specific attraction names and tour operators.`,
    
    localTransportation: `
    - Budget: public transport, walking
    - Medium: mix of public transport and taxis
    - Premium: private transfers, car rentals
    Include specific transport companies and services.`,
    
    shopping: `
    - Budget: local markets, basic souvenirs
    - Medium: mix of markets and retail stores
    - Premium: high-end shopping, luxury items
    Include specific shopping areas and store recommendations.`
  };

  return guidelines[category] || 'Consider all price tiers and local options.';
}
