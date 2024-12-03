const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const API_URL = 'https://api.perplexity.ai/chat/completions';

interface TierEstimate {
  min: number;
  max: number;
  average: number;
  confidence: number;
  source?: string;
}

interface CategoryEstimate {
  budget: TierEstimate;
  medium: TierEstimate;
  premium: TierEstimate;
  currency: string;
}

export type CategoryEstimates = Record<string, CategoryEstimate>;

interface PerplexityOptions {
  onLLMResponse?: (category: string, response: Record<string, any>) => void;
}

interface TripPlanData {
  country: string;
  startDate: Date;
  endDate: Date;
  travelers: string;
  currency: string;
  selectedCategories: string[];
  expenses: any[];
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Flights', key: 'flight', defaultPercentage: 30 },
  { name: 'Accommodation', key: 'accommodation', defaultPercentage: 30 },
  { name: 'Local Transportation', key: 'localTransportation', defaultPercentage: 10 },
  { name: 'Food & Beverages', key: 'food', defaultPercentage: 15 },
  { name: 'Cultural Activities', key: 'activities', defaultPercentage: 10 },
  { name: 'Shopping', key: 'shopping', defaultPercentage: 5 },
  { name: 'Car Rental', key: 'carRental', defaultPercentage: 0 },
] as const;

function generatePromptForTier(data: TripPlanData, category: string, tier: string): string {
  const startDate = new Date(data.startDate).toISOString().split('T')[0];
  const endDate = new Date(data.endDate).toISOString().split('T')[0];
  
  return `Return a JSON object with cost estimates for ${tier}-tier ${category} in ${data.country}.
Trip details:
- Dates: ${startDate} to ${endDate}
- Travelers: ${data.travelers}
- Currency: ${data.currency}

Required JSON format:
{
  "min": number,
  "max": number,
  "average": number,
  "confidence": number,
  "source": string
}

Rules:
1. Return ONLY the JSON object, no additional text
2. All numbers must be valid numbers, not strings
3. Min must be less than max
4. Average must be between min and max
5. Confidence must be between 0 and 1
6. Source should be a brief description of data source`;
}

function validateEstimateFormat(estimate: unknown): estimate is TierEstimate {
  if (!estimate || typeof estimate !== 'object') return false;
  
  const e = estimate as Record<string, unknown>;
  
  return (
    typeof e.min === 'number' &&
    typeof e.max === 'number' &&
    typeof e.average === 'number' &&
    typeof e.confidence === 'number' &&
    e.min >= 0 &&
    e.max >= e.min &&
    e.average >= e.min &&
    e.average <= e.max &&
    e.confidence >= 0 &&
    e.confidence <= 1
  );
}

async function fetchEstimate(prompt: string, onLLMResponse?: (category: string, response: any) => void) {
  const requestBody = {
    model: "llama-3.1-sonar-huge-128k-online",
    messages: [
      {
        role: "system",
        content: "You are a JSON API. You must respond with ONLY a valid JSON object matching the specified format. Do not include any explanatory text or markdown formatting."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };

  console.log('Sending request to Perplexity:', {
    url: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify(requestBody, null, 2)
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', {
      status: response.status,
      statusText: response.statusText,
      errorText
    });
    throw new Error(`API error: ${response.statusText}\nDetails: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in API response');
  }

  try {
    // Extract just the JSON part using regex
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const cleanContent = jsonMatch[0];
    console.log('Extracted JSON:', cleanContent);
    
    const parsedContent = JSON.parse(cleanContent);

    if (!validateEstimateFormat(parsedContent)) {
      throw new Error('Invalid estimate format');
    }

    return parsedContent;
  } catch (error) {
    console.error('Failed to parse response:', content);
    console.error('Parse error:', error);
    
    return {
      min: 0,
      max: 0,
      average: 0,
      confidence: 0,
      source: 'Error parsing estimate'
    };
  }
}

export async function getPerplexityEstimates(
  tripData: TripPlanData & PerplexityOptions
): Promise<CategoryEstimates> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key not configured');
  }

  const estimates: CategoryEstimates = {};
  const categories = tripData.selectedCategories;
  const tiers = ['budget', 'medium', 'premium'] as const;

  for (const category of categories) {
    try {
      const categoryEstimates: CategoryEstimate = {
        budget: null,
        medium: null,
        premium: null,
        currency: tripData.currency
      };

      for (const tier of tiers) {
        const prompt = generatePromptForTier(tripData, category, tier);
        try {
          const estimate = await fetchEstimate(prompt, tripData.onLLMResponse);
          categoryEstimates[tier] = estimate;
        } catch (error) {
          console.error(`Error getting ${tier} estimate for ${category}:`, error);
          categoryEstimates[tier] = createEmptyEstimate();
        }
      }

      estimates[category] = categoryEstimates;
    } catch (error) {
      console.error(`Error getting estimate for ${category}:`, error);
      estimates[category] = {
        budget: createEmptyEstimate(),
        medium: createEmptyEstimate(),
        premium: createEmptyEstimate(),
        currency: tripData.currency
      };
    }
  }

  return estimates;
}

function createEmptyEstimate(): TierEstimate {
  return {
    min: 0,
    max: 0,
    average: 0,
    confidence: 0,
    source: 'Error fetching estimate'
  };
}

export type { TierEstimate, CategoryEstimate, PerplexityOptions, TripPlanData };
