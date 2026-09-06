import { parsePriceToEuros } from '../function/common';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';
import { ScraperFn } from '../utils/types';
import { CookiesPage } from '../page/elCorteIngles/cookiePage';
import { HomePage } from '../page/elCorteIngles/homePage';
import { SearchListPage } from '../page/elCorteIngles/searchListPage';

export const elCorteInglesScraper: ScraperFn = async ({context, productId,url }) => {

  try {
    logger.info({ event: LOG_EVENT.PROVIDER_SCRAPE_STARTED, provider: 'elCorteIngles', productId }, 'Starting El Corte Inglés scraper');

    const page = await context.newPage();
    await page.goto(url);
    const cookiesPage = new CookiesPage(page);
    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    
    await cookiesPage.clickRejectButton();
    await homePage.searchForReference(productId);
    const rawPrice = await searchListPage.priceItem();

    const price = parsePriceToEuros(rawPrice);
    logger.info({ event: LOG_EVENT.PROVIDER_PRICE_OBTAINED, provider: 'elCorteIngles', productId, price }, 'Price obtained from El Corte Inglés');
    return price;
  } catch (error) {
    logger.error({ event: LOG_EVENT.PROVIDER_SCRAPE_FAILED, provider: 'elCorteIngles', productId, error: normalizeLogError(error) }, 'El Corte Inglés scraper failed');
    throw error;
  }
};