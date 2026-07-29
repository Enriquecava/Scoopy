export type ScraperInput = {
  productId: string; // asin, sku, ean...
};

export type ScraperFn = (input: ScraperInput) => Promise<number>;