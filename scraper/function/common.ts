export function normalizePriceText(priceText: string): string {
  if (!priceText) {
    throw new Error('Price text is empty');
  }

  const match = priceText
    .trim()
    .match(/(?:^|[^\d])(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)(?!\d)/);

  if (!match?.[1]) {
    throw new Error(`Could not normalize price from: ${priceText}`);
  }

  const numericValue = match[1];
  const hasComma = numericValue.includes(',');
  const hasDot = numericValue.includes('.');

  if (hasComma && hasDot) {
    const lastComma = numericValue.lastIndexOf(',');
    const lastDot = numericValue.lastIndexOf('.');

    return lastComma > lastDot
      ? numericValue.replace(/\./g, '').replace(/,/g, '.')
      : numericValue.replace(/,/g, '');
  }

  if (hasComma) {
    return numericValue.replace(/,/g, '.');
  }

  return numericValue;
}

export function parsePriceToEuros(priceText: string): number {
  const normalized = normalizePriceText(priceText);
  const numericValue = Number.parseFloat(normalized);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Could not parse price from: ${priceText}`);
  }

  return Number(numericValue.toFixed(2));
}