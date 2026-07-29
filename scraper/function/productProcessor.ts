import { getProductsBySSN, upsertProductPrice } from './postgres';
import { amazonScraper } from '../providers/amazon';
import { ScraperFn } from '../utils/types';
import { Browser, chromium } from '@playwright/test';
import {AMAZON_PROVIDER_ID} from '../utils/providers';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

const scrapers: Record<number, ScraperFn> = {
  [AMAZON_PROVIDER_ID]: amazonScraper,
};

export async function scrapeAndStoreProductPrice(
  browser:Browser,
  asin: string,
  provider_id: number,
): Promise<number> {
  if (!asin || asin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const scraper = scrapers[provider_id];
  if (!scraper) {
    throw new Error(`Unsupported provider_id: ${provider_id}`);
  }
  const context = await browser.newContext();
  return scraper({ context: context, productId: asin });
}

async function runFromCli(asin?: string): Promise<void> {

  const targetAsin = asin ?? process.argv[2];

  if (!targetAsin || targetAsin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const products = await getProductsBySSN(targetAsin);
  if (!products) {
    throw new Error(`No product found for SSN/ASIN: ${targetAsin}`);
  }
  const browser = await chromium.launch({ headless: headless });

  const price = await scrapeAndStoreProductPrice(
    browser,
    products.ssn,
    products.provider_id,
  );
  
  await upsertProductPrice({
    provider_id: products.provider_id,
    product_id: products.product_id,
    price,
    currency: 'EUR',
  });
  console.log(`Price saved for ${products.ssn}: ${price} EUR`);

  await browser.close()
}

if (require.main === module) {
  runFromCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
