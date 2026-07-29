import { getProductsBySSN, upsertProductPrice } from './postgres';
import { amazonScrapper } from '../providers/amazon';
import { ScraperFn } from '../utils/types';
import { Browser, chromium } from '@playwright/test';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

const scrappers: Record<number, ScraperFn> = {
  1: amazonScrapper,
};

export async function scrapeAndStoreProductPrice(
  browser:Browser,
  asin: string,
  provider_id: number,
): Promise<number> {
  if (!asin || asin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const context = await browser.newContext();
  const scrapper = scrappers[provider_id];
  return scrapper({ context: context, productId: asin });
}

async function runFromCli(asin?: string): Promise<void> {
  const browser = await chromium.launch({ headless: headless });

  const targetAsin = asin ?? process.argv[2];

  if (!targetAsin || targetAsin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const products = await getProductsBySSN(targetAsin);
  if (!products) {
    throw new Error(`No product found for SSN/ASIN: ${targetAsin}`);
  }

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
