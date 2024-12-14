const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const API_URL = 'https://api.perplexity.ai/chat/completions';
const API_KEY = process.env.PERPLEXITY_API_KEY;

async function getFlightEstimates(testData) {
  const prompt = `Search for current flight costs from ${testData.departureLocation} to ${testData.country} between ${testData.startDate} and ${testData.endDate} for ${testData.travelers} travelers.
  
  Return ONLY a JSON object with flight cost estimates for different tiers.
  Use exactly this format, with no additional text:
  {
    "flight": {
      "Budget": {
        "Minimum": number,
        "Maximum": number,
        "Average": number,
        "Confidence": number,
        "Source": string,
        "Examples": array of strings
      },
      "Medium": {
        // same structure as Budget
      },
      "Premium": {
        // same structure as Budget
      }
    }
  }

  All costs must be in ${testData.currency}.
  Ensure all numbers are valid numbers, not strings.
  Each Confidence value must be between 0 and 1.
  Include at least 2 example airlines or routes in Examples array.`;

  return makePerplexityRequest(prompt, 'flight cost estimation');
}

async function getGeneralEstimates(testData) {
  const categories = ['accommodation', 'food', 'localTransportation', 'activities'];
  const prompt = `Search for current daily costs in ${testData.country} between ${testData.startDate} and ${testData.endDate} for ${testData.travelers} travelers.
  
  Return ONLY a JSON object with estimates for these categories: ${categories.join(', ')}
  Use exactly this format, with no additional text:
  {
    "Accommodation": {
      "Budget": {
        "Minimum": number,
        "Maximum": number,
        "Average": number,
        "Confidence": number,
        "Source": string,
        "Examples": array of strings
      },
      "Medium": {
        // same structure as Budget
      },
      "Premium": {
        // same structure as Budget
      }
    },
    "Food": {
      // same structure as Accommodation
    },
    "LocalTransportation": {
      // same structure as Accommodation
    },
    "Activities": {
      // same structure as Accommodation
    }
  }

  All costs must be in ${testData.currency} per day.
  Ensure all numbers are valid numbers, not strings.
  Each Confidence value must be between 0 and 1.
  Include at least 2 examples in Examples array for each category/tier.`;

  return makePerplexityRequest(prompt, 'general cost estimation');
}

async function makePerplexityRequest(prompt, type) {
  console.log(`\n=== Making ${type} request ===`);
  console.log('Prompt:', prompt);

  const requestBody = {
    model: "llama-3.1-sonar-huge-128k-online",
    messages: [
      {
        role: "system",
        content: "You are a travel cost estimation assistant. Provide accurate cost estimates in JSON format. Always use the exact format specified in the prompt."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };

  console.log('\nRequest body:', JSON.stringify(requestBody, null, 2));

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
    console.error('API error response:', errorText);
    throw new Error(`API error: ${response.statusText}\nDetails: ${errorText}`);
  }

  const data = await response.json();
  console.log('\nRaw API response:', JSON.stringify(data, null, 2));

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in response');
  }

  console.log('\nResponse content:', content);
  
  try {
    // Remove markdown code block if present
    const jsonContent = content.replace(/^```json\n|\n```$/g, '').trim();
    console.log('\nCleaned content:', jsonContent);
    
    const parsed = JSON.parse(jsonContent);
    console.log('\nParsed response:', JSON.stringify(parsed, null, 2));
    
    // Transform the response to match our expected format
    const transformed = {};
    
    // Handle flight estimates
    if (parsed.flight) {
      transformed.flight = {
        budget: {
          min: parsed.flight.Budget.Minimum,
          max: parsed.flight.Budget.Maximum,
          average: parsed.flight.Budget.Average,
          confidence: parsed.flight.Budget.Confidence,
          source: parsed.flight.Budget.Source,
          examples: parsed.flight.Budget.Examples
        },
        medium: {
          min: parsed.flight.Medium.Minimum,
          max: parsed.flight.Medium.Maximum,
          average: parsed.flight.Medium.Average,
          confidence: parsed.flight.Medium.Confidence,
          source: parsed.flight.Medium.Source,
          examples: parsed.flight.Medium.Examples
        },
        premium: {
          min: parsed.flight.Premium.Minimum,
          max: parsed.flight.Premium.Maximum,
          average: parsed.flight.Premium.Average,
          confidence: parsed.flight.Premium.Confidence,
          source: parsed.flight.Premium.Source,
          examples: parsed.flight.Premium.Examples
        }
      };
    }
    
    // Handle general estimates
    ['Accommodation', 'Food', 'LocalTransportation', 'Activities'].forEach(category => {
      if (parsed[category]) {
        const key = category.toLowerCase();
        transformed[key] = {
          budget: {
            min: parsed[category].Budget.Minimum,
            max: parsed[category].Budget.Maximum,
            average: parsed[category].Budget.Average,
            confidence: parsed[category].Budget.Confidence,
            source: parsed[category].Budget.Source,
            examples: parsed[category].Budget.Examples
          },
          medium: {
            min: parsed[category].Medium.Minimum,
            max: parsed[category].Medium.Maximum,
            average: parsed[category].Medium.Average,
            confidence: parsed[category].Medium.Confidence,
            source: parsed[category].Medium.Source,
            examples: parsed[category].Medium.Examples
          },
          premium: {
            min: parsed[category].Premium.Minimum,
            max: parsed[category].Premium.Maximum,
            average: parsed[category].Premium.Average,
            confidence: parsed[category].Premium.Confidence,
            source: parsed[category].Premium.Source,
            examples: parsed[category].Premium.Examples
          }
        };
      }
    });
    
    console.log('\nTransformed response:', JSON.stringify(transformed, null, 2));
    return transformed;
  } catch (error) {
    console.error('Error parsing response:', error);
    throw error;
  }
}

async function testPerplexityConnection() {
  console.log('\n=== Testing Perplexity API Connection ===');
  
  if (!API_KEY) {
    console.error('❌ No API key found in environment variables');
    return;
  }
  console.log('✓ API key found:', API_KEY.substring(0, 4) + '...');

  const testData = {
    country: 'United States',
    departureLocation: 'Tel Aviv, TLV',
    startDate: '2024-12-11',
    endDate: '2024-12-24',
    travelers: '2',
    currency: 'USD'
  };

  try {
    console.log('\n=== Testing Flight Estimates ===');
    const flightEstimates = await getFlightEstimates(testData);
    console.log('\nFlight Estimates Results:');
    console.log(JSON.stringify(flightEstimates, null, 2));

    console.log('\n=== Testing General Estimates ===');
    const generalEstimates = await getGeneralEstimates(testData);
    console.log('\nGeneral Estimates Results:');
    console.log(JSON.stringify(generalEstimates, null, 2));

    console.log('\n✓ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

testPerplexityConnection().catch(console.error); 