const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const API_URL = 'https://api.perplexity.ai/chat/completions';
const API_KEY = process.env.PERPLEXITY_API_KEY;

const PRICE_TIERS = ['budget', 'medium', 'premium'];

async function getEstimateForTier(category, testData, tier) {
  const prompt = `Search for current average costs for ${category} in ${testData.country} between ${testData.startDate} and ${testData.endDate} for ${testData.travelers} travelers.
  Consider ${tier} level accommodations and services.
  
  Return ONLY a JSON object in exactly this format, with no additional text:
  {
    "min": number (lowest reasonable cost for ${tier} tier),
    "max": number (highest reasonable cost for ${tier} tier),
    "average": number (typical cost for ${tier} tier),
    "confidence": number (between 0 and 1),
    "source": string (brief description of main data source)
  }

  All costs must be in ${testData.currency}.
  Ensure all numbers are valid numbers, not strings.
  The confidence value must be between 0 and 1.`;

  const requestBody = {
    model: "llama-3.1-sonar-huge-128k-online",
    messages: [
      {
        role: "system",
        content: `You are a travel cost estimation assistant specializing in ${tier}-tier travel experiences.`
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.statusText}\nDetails: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  return content ? JSON.parse(content) : null;
}

async function testPerplexityConnection() {
  console.log('\n=== Testing Perplexity API Connection ===');
  
  if (!API_KEY) {
    console.error('❌ No API key found in environment variables');
    return;
  }
  console.log('✓ API key found:', API_KEY.substring(0, 4) + '...');

  const testData = {
    country: 'France',
    startDate: '2024-12-01',
    endDate: '2024-12-14',
    travelers: '2',
    currency: 'USD'
  };

  const categories = ['accommodation', 'food', 'activities'];

  try {
    for (const category of categories) {
      console.log(`\n=== Testing ${category} category ===`);
      
      const tierEstimates = {};
      
      for (const tier of PRICE_TIERS) {
        console.log(`\nFetching ${tier} tier estimates...`);
        tierEstimates[tier] = await getEstimateForTier(category, testData, tier);
      }

      console.log('\nResults for', category);
      console.table(Object.entries(tierEstimates).map(([tier, estimate]) => ({
        Tier: tier,
        Min: `$${estimate.min}`,
        Max: `$${estimate.max}`,
        Average: `$${estimate.average}`,
        Confidence: `${(estimate.confidence * 100).toFixed(1)}%`
      })));
    }

    console.log('\n✓ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

testPerplexityConnection().catch(console.error); 