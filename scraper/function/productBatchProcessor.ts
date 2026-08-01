import { scrapeAndStoreProductPrice } from './productProcessor';
import { getProducts, upsertProductPrice } from './postgres';
import { chromium } from '@playwright/test';
import { logger } from '../utils/logger';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

export async function processProductsFromDatabase(): Promise<void> {
  const result = await getProducts();
  const browser = await chromium.launch({ headless: headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
    ],
   });

  try {
    for (const { ssn, provider_id, product_id } of result) {
      try {
        const price = await scrapeAndStoreProductPrice(
          browser,
          ssn,
          provider_id,
        );
        await upsertProductPrice({
          provider_id,
          product_id,
          price,
          currency: 'EUR',
        });
        logger.info({
          event: 'product_price_saved',
          asin: ssn,
          provider_id: Number(provider_id),
          product_id,
          price,
          currency: 'EUR',
        }, 'Product price saved');
      } catch (error) {
        logger.error({
          event: 'product_processing_failed',
          asin: ssn,
          provider_id,
          product_id,
        }, 'Error processing product');
      }
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  processProductsFromDatabase().catch((error) => {
    logger.error({ event: 'batch_processing_failed', error }, 'Batch processing failed');
    process.exitCode = 1;
  });
}
