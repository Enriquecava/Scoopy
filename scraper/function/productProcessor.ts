import { getProductsBySSN, upsertProductPrice } from './postgres';
import { closeScraperIncident, openScraperIncident } from './incidents';
import { amazonScraper } from '../providers/amazon';
import { primorScraper } from '../providers/primor';
import { druniScraper } from '../providers/druni';
import { ScraperFn } from '../utils/types';
import { Browser, chromium } from '@playwright/test';
import { UUID } from 'crypto';
import {AMAZON_PROVIDER_ID,CARREFOUR_PROVIDER_ID, PRIMOR_PROVIDER_ID, DRUNI_PROVIDER_ID, EL_CORTE_INGLES_PROVIDER_ID} from '../utils/providers';
import { carrefourScraper } from '../providers/carrefour';
import { elCorteInglesScraper } from '../providers/elCorteIngles';
import { closeLogger, LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;
const MAX_SCRAPER_RETRIES = 3;

const scrapers: Record<number, ScraperFn> = {
  [AMAZON_PROVIDER_ID]: amazonScraper,
  [CARREFOUR_PROVIDER_ID]: carrefourScraper,
  [PRIMOR_PROVIDER_ID]: primorScraper,
  [DRUNI_PROVIDER_ID]: druniScraper,
  [EL_CORTE_INGLES_PROVIDER_ID]: elCorteInglesScraper,
};

export async function scrapeAndStoreProductPrice(
  browser:Browser,
  asin: string,
  provider_id: number,
  product_id: UUID,
  url: string,
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
  
  const contextConfig = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_SCRAPER_RETRIES; attempt += 1) {
    const context = await browser.newContext(contextConfig);

    try {
      await context.addInitScript(()=>{
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        })
      })
      const price = await scraper({ context: context, productId: asin, url: url });
      await context.close();
      await closeScraperIncident({ provider_id, product_id, asin });
      return price;
    } catch (error) {
      await context.close();
      lastError = error;
      logger.warn({
        event: LOG_EVENT.PROVIDER_SCRAPE_FAILED,
        asin,
        provider_id,
        product_id,
        attempt,
        maxAttempts: MAX_SCRAPER_RETRIES,
        error: normalizeLogError(error),
      }, `Provider scraper failed on attempt ${attempt}/${MAX_SCRAPER_RETRIES}`);

      if (attempt === MAX_SCRAPER_RETRIES) {
        await openScraperIncident({ provider_id, product_id, asin });
        throw error;
      }
    }
  }

  throw lastError ?? new Error(`Provider scraper failed for ${asin}`);
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
      products.product_id,
      products.url,
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
