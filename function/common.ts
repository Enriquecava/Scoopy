export function parsePriceToEuros(priceText: string): number {
  if (!priceText) {
    throw new Error('Price text is empty');
  }

  const normalized = priceText
    .replace(/[^\d,.-]/g, '')
    .trim();

  if (!normalized) {
    throw new Error(`Could not parse price from: ${priceText}`);
  }

  const numericValue = Number.parseFloat(
    normalized.replace(/\./g, '').replace(/,/g, '.')
  );

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Could not parse price from: ${priceText}`);
  }

  return Number(numericValue.toFixed(2));
}