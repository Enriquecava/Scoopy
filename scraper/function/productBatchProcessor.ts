import { getProducts } from './postgres';
import { chromium } from '@playwright/test';
import { closeLogger, LOG_EVENT, logger, normalizeLogError } from '../utils/logger';
import { processProductWithRetries } from './productProcessor';

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
    for (const { ssn, provider_id, product_id ,url} of result) {
      try {
        await processProductWithRetries(browser, { ssn, provider_id, product_id, url });
      } catch (error) {
        logger.error({
          event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
          asin: ssn,
          provider_id: Number(provider_id),
          product_id,
          error: normalizeLogError(error),
        }, 'Error processing product');
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
