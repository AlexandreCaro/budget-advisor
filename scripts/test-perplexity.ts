const dotenv = require('dotenv');
const { getPerplexityEstimates } = require('../lib/cost-estimation/perplexity');

interface CostEstimate {
  min: number;
  max: number;
  average: number;
  confidence: number;
  currency: string;
  source?: string;
}

interface CategoryEstimates {
  [key: string]: CostEstimate;
}

dotenv.config();

async function testPerplexityConnection() {
  console.log('\n=== Testing Perplexity API Connection ===');
  
  // Check API key
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key found in environment variables');
    return;
  }
  console.log('✓ API key found:', apiKey.substring(0, 4) + '...');

  // Test data
  const testData = {
    country: 'France',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2024-12-14'),
    travelers: '2',
    currency: 'USD',
    selectedCategories: ['accommodation', 'food', 'activities'],
    expenses: [],
    name: 'Test Trip',
    status: 'DRAFT',
    overallBudget: '5000'
  };

  try {
    console.log('\nSending test request with data:', JSON.stringify(testData, null, 2));
    
    const estimates = await getPerplexityEstimates({
      ...testData,
      onLLMResponse: (category: string, response: Record<string, any>) => {
        console.log(`\n=== Response for ${category} ===`);
        console.log(JSON.stringify(response, null, 2));
      }
    });

    console.log('\n=== Test Results ===');
    console.table(Object.entries(estimates as CategoryEstimates).map(([category, estimate]) => ({
      Category: category,
      Min: `$${estimate.min}`,
      Max: `$${estimate.max}`,
      Average: `$${estimate.average}`,
      Confidence: `${(estimate.confidence * 100).toFixed(1)}%`
    })));

    console.log('\n✓ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testPerplexityConnection().catch(console.error);
