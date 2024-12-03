export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function getCurrencySymbol(currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).formatToParts(0).find(part => part.type === 'currency')?.value || currency;
  } catch (error) {
    console.error('Currency symbol error:', error);
    return currency;
  }
} 