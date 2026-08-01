import { getProductsBySSN, upsertProductPrice } from './postgres';
import { amazonScraper } from '../providers/amazon';
import { ScraperFn } from '../utils/types';
import { Browser, chromium } from '@playwright/test';
import {AMAZON_PROVIDER_ID,CARREFOUR_PROVIDER_ID} from '../utils/providers';
import { carrefourScraper } from '../providers/carrefour';
import { closeLogger, LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

const scrapers: Record<number, ScraperFn> = {
  [AMAZON_PROVIDER_ID]: amazonScraper,
  [CARREFOUR_PROVIDER_ID]: carrefourScraper
};

export async function scrapeAndStoreProductPrice(
  browser:Browser,
  asin: string,
  provider_id: number,
): Promise<number> {
  if (!asin || asin.trim() === '') {
    logger.warn({ event: LOG_EVENT.INVALID_PRODUCT_INPUT, asin, provider_id }, 'ASIN is required');
    throw new Error('ASIN is required');
  }
  const scraper = scrapers[provider_id];
  if (!scraper) {
    logger.error({ event: LOG_EVENT.UNSUPPORTED_PROVIDER, provider_id, asin }, 'Unsupported provider requested');
    throw new Error(`Unsupported provider_id: ${provider_id}`);
  }
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
  });
  await context.addInitScript(()=>{
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    })
  })
  return scraper({ context: context, productId: asin });
}

async function runFromCli(asin?: string): Promise<void> {

  const targetAsin = asin ?? process.argv[2];

  if (!targetAsin || targetAsin.trim() === '') {
    logger.warn({ event: LOG_EVENT.INVALID_CLI_INPUT }, 'ASIN is required');
    throw new Error('ASIN is required');
  }
  const products = await getProductsBySSN(targetAsin);
  if (!products) {
    logger.warn({ event: LOG_EVENT.PRODUCT_NOT_FOUND, asin: targetAsin }, 'No product found for SSN/ASIN');
    throw new Error(`No product found for SSN/ASIN: ${targetAsin}`);
  }
  const browser = await chromium.launch({ headless: headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
    ],
  });

  try{
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
    logger.info({
      event: LOG_EVENT.PRODUCT_PRICE_SAVED,
      asin: products.ssn,
      provider_id: Number(products.provider_id),
      product_id: products.product_id,
      price,
      currency: 'EUR',
    }, 'Product price saved');
  } finally{
    await browser.close()
  }
}

if (require.main === module) {
  runFromCli().catch((error) => {
    logger.error({ event: LOG_EVENT.CLI_RUN_FAILED, error: normalizeLogError(error) }, 'CLI execution failed');
    closeLogger();
    process.exitCode = 1;
  }).finally(() => {
    closeLogger();
  });
}
