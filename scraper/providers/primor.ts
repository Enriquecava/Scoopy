import { parsePriceToEuros } from '../function/common';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';
import { ScraperFn } from '../utils/types';
import { CookiesPage } from '../page/primor/cookiePage';
import { HomePage } from '../page/primor/homePage';
import { SearchListPage } from '../page/primor/searchListPage';

export const primorScraper: ScraperFn = async ({context,productId }) => {

  try {
    logger.info({ event: LOG_EVENT.PROVIDER_SCRAPE_STARTED, provider: 'primor', productId }, 'Starting Primor scraper');

    const page = await context.newPage();
    await page.goto('https://www.primor.eu/es_es/');
    const cookiesPage = new CookiesPage(page);
    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    
    await cookiesPage.clickRejectButton();
    await homePage.searchForReference(productId);
    const rawPrice = await searchListPage.priceItem();

    const price = parsePriceToEuros(rawPrice);
    logger.info({ event: LOG_EVENT.PROVIDER_PRICE_OBTAINED, provider: 'primor', productId, price }, 'Price obtained from Primor');
    return price;
  } catch (error) {
    logger.error({ event: LOG_EVENT.PROVIDER_SCRAPE_FAILED, provider: 'primor', productId, error: normalizeLogError(error) }, 'Primor scraper failed');
    throw error;
  } finally {
    await context.close();
  }
};