export async function getDestinationCosts(country: string, travelers: number, nights: number) {
  try {
    const response = await fetch('/api/costs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country,
        travelers,
        nights,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching costs:', error);
    return null;
  }
}

