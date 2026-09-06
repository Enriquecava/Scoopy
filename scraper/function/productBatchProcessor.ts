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
  const batchStartedAt = performance.now();
  let totalProducts = 0;
  let successfulProducts = 0;
  let failedProducts = 0;

  logger.info({ event: LOG_EVENT.BATCH_PROCESSING_STARTED }, 'Batch processing started');

  try {
    const result = await getProducts();
    totalProducts = result.length;
    const browser = await chromium.launch({ headless: headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
      ],
     });

    try {
      for (const [index, { ssn, provider_id, product_id ,url}] of result.entries()) {
        const productStartedAt = performance.now();

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
          successfulProducts += 1;
          logger.info({
            event: LOG_EVENT.PRODUCT_PRICE_SAVED,
            asin: ssn,
            provider_id: Number(provider_id),
            product_id,
            price,
            currency: 'EUR',
            elapsed_ms: Math.round(performance.now() - productStartedAt),
          }, 'Product price saved');
        } catch (error) {
          failedProducts += 1;
          logger.error({
            event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
            asin: ssn,
            provider_id: Number(provider_id),
            product_id,
            elapsed_ms: Math.round(performance.now() - productStartedAt),
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
  } finally {
    logger.info({
      event: LOG_EVENT.BATCH_PROCESSING_COMPLETED,
      total_products: totalProducts,
      successful_products: successfulProducts,
      failed_products: failedProducts,
      elapsed_ms: Math.round(performance.now() - batchStartedAt),
    }, 'Batch processing completed');
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
