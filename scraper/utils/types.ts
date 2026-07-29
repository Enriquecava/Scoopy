import { BrowserContext } from '@playwright/test';

export type ScraperInput = {
  context: BrowserContext,
  productId: string; // asin, sku, ean...
};

export type ScraperFn = (input: ScraperInput) => Promise<number>;