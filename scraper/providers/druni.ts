import { parsePriceToEuros } from '../function/common';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';
import { ScraperFn } from '../utils/types';
import { CookiesPage } from '../page/druni/cookiesPage';
import { HomePage } from '../page/druni/homePage';
import { SearchListPage } from '../page/druni/searchListPage';

export const druniScraper: ScraperFn = async ({context,productId,url }) => {

  try {
    logger.info({ event: LOG_EVENT.PROVIDER_SCRAPE_STARTED, provider: 'druni', productId }, 'Starting Druni scraper');

    const page = await context.newPage();
    await page.goto(url);
    const cookiesPage = new CookiesPage(page);
    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    
    await cookiesPage.clickRejectButton();
    await homePage.searchForReference(productId);
    await page.waitForTimeout(300)
    const rawPrice = await searchListPage.priceItem();

    const price = parsePriceToEuros(rawPrice);
    logger.info({ event: LOG_EVENT.PROVIDER_PRICE_OBTAINED, provider: 'druni', productId, price }, 'Price obtained from Druni');
    return price;
  } catch (error) {
    logger.error({ event: LOG_EVENT.PROVIDER_SCRAPE_FAILED, provider: 'druni', productId, error: normalizeLogError(error) }, 'Druni scraper failed');
    throw error;
  }
};