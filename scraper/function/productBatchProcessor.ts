import { scrapeAndStoreProductPrice } from './productProcessor';
import { getProducts, upsertProductPrice } from './postgres';
import { chromium } from '@playwright/test';
import { closeLogger, LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;
const BATCH_DELAY_MS = Number(process.env.SCRAPER_BATCH_DELAY_MS ?? 3000);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processProductsFromDatabase(): Promise<void> {
  const result = await getProducts();
  const browser = await chromium.launch({ headless: headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
    ],
   });

  try {
    for (const [index, { ssn, provider_id, product_id ,url}] of result.entries()) {
      try {
        const price = await scrapeAndStoreProductPrice(
          browser,
          ssn,
          provider_id,
          product_id,
          url,
        );
        await upsertProductPrice({
          provider_id,
          product_id,
          price,
          currency: 'EUR',
        });
        logger.info({
          event: LOG_EVENT.PRODUCT_PRICE_SAVED,
          asin: ssn,
          provider_id: Number(provider_id),
          product_id,
          price,
          currency: 'EUR',
        }, 'Product price saved');
      } catch (error) {
        logger.error({
          event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
          asin: ssn,
          provider_id: Number(provider_id),
          product_id,
          error: normalizeLogError(error),
        }, 'Error processing product');
      }

      if (index < result.length - 1) {
        await delay(BATCH_DELAY_MS);
      }
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  processProductsFromDatabase().catch((error) => {
    logger.error({ event: LOG_EVENT.BATCH_PROCESSING_FAILED, error: normalizeLogError(error) }, 'Batch processing failed');
    closeLogger();
    process.exitCode = 1;
  }).finally(() => {
    closeLogger();
  });
}
