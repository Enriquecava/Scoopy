import { getProductsBySSN, upsertProductPrice } from './postgres';
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
import { tryMarkScraperIncidentOpen, tryMarkScraperIncidentResolved } from './scraperIncidents';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

const scrapers: Record<number, ScraperFn> = {
  [AMAZON_PROVIDER_ID]: amazonScraper,
  [CARREFOUR_PROVIDER_ID]: carrefourScraper,
  [PRIMOR_PROVIDER_ID]: primorScraper,
  [DRUNI_PROVIDER_ID]: druniScraper,
  [EL_CORTE_INGLES_PROVIDER_ID]: elCorteInglesScraper,
};

const MAX_SCRAPE_RETRIES = 3;

class ScraperExecutionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ScraperExecutionError';

    if (options && 'cause' in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeAndStoreProductPrice(
  browser:Browser,
  asin: string,
  provider_id: number,
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

  try {
    return await scraper({ context: context, productId: asin, url: url });
  } catch (error) {
    throw new ScraperExecutionError('Scraper execution failed', { cause: error });
  }
}

export interface ScrapeTarget {
  ssn: string;
  provider_id: number;
  product_id: UUID;
  url: string;
}

export async function runScrapeWithRetries(params: {
  maxAttempts: number;
  runAttempt: (attempt: number) => Promise<number>;
  onAttemptFailed: (attempt: number, error: unknown) => Promise<void>;
  onAllAttemptsFailed: () => Promise<void>;
}): Promise<number> {
  const { maxAttempts, runAttempt, onAttemptFailed, onAllAttemptsFailed } = params;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runAttempt(attempt);
    } catch (error) {
      lastError = error;
      await onAttemptFailed(attempt, error);
    }
  }

  await onAllAttemptsFailed();

  throw lastError instanceof Error
    ? lastError
    : new Error(`Scraper failed after ${maxAttempts} attempts`);
}

async function scrapeProductWithRetries(
  browser: Browser,
  product: ScrapeTarget,
): Promise<number> {
  return runScrapeWithRetries({
    maxAttempts: MAX_SCRAPE_RETRIES,
    runAttempt: async () => {
      return scrapeAndStoreProductPrice(
        browser,
        product.ssn,
        product.provider_id,
        product.url,
      );
    },
    onAttemptFailed: async (attempt, error) => {
      if (!(error instanceof ScraperExecutionError)) {
        throw error;
      }

      logger.warn({
        event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
        asin: product.ssn,
        provider_id: Number(product.provider_id),
        product_id: product.product_id,
        attempt,
        max_attempts: MAX_SCRAPE_RETRIES,
        error: normalizeLogError(error),
      }, 'Scrape attempt failed');

      if (attempt < MAX_SCRAPE_RETRIES) {
        await delay(1000 * attempt);
      }
    },
    onAllAttemptsFailed: async () => {
      await tryMarkScraperIncidentOpen({
        provider_id: product.provider_id,
        product_id: product.product_id,
      });
    },
  });
}

async function saveScrapedPrice(product: ScrapeTarget, price: number): Promise<void> {
  await upsertProductPrice({
    provider_id: product.provider_id,
    product_id: product.product_id,
    price,
    currency: 'EUR',
  });
}

function logScrapedPriceSaved(product: ScrapeTarget, price: number): void {
  logger.info({
    event: LOG_EVENT.PRODUCT_PRICE_SAVED,
    asin: product.ssn,
    provider_id: Number(product.provider_id),
    product_id: product.product_id,
    price,
    currency: 'EUR',
  }, 'Product price saved');
}

export async function processProductWithRetries(
  browser: Browser,
  product: ScrapeTarget,
): Promise<void> {
  const price = await scrapeProductWithRetries(browser, product);

  await tryMarkScraperIncidentResolved({
    provider_id: product.provider_id,
    product_id: product.product_id,
  });

  await saveScrapedPrice(product, price);
  logScrapedPriceSaved(product, price);
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
    await processProductWithRetries(browser, products);
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
