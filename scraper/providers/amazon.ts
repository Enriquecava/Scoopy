import { parsePriceToEuros } from '../function/common';
import { CookiesPage } from '../page/amazon/cookiesPage';
import { HomePage } from '../page/amazon/homePage';
import { SearchListPage } from '../page/amazon/searchListPage';
import { logger } from '../utils/logger';
import { ScraperFn } from '../utils/types';

export const amazonScraper: ScraperFn = async ({context,productId }) => {

  try {
    logger.info({ event: 'provider_scrape_started', provider: 'amazon', productId }, 'Starting Amazon scrape');

    const page = await context.newPage();
    await page.goto('https://www.amazon.es/');

    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    const cookiesPage = new CookiesPage(page);

    await cookiesPage.clickAcceptButton();
    await homePage.searchForAsin(productId);

    const rawPrice = await searchListPage.priceItem(productId);
    const price = parsePriceToEuros(rawPrice);

    logger.info({ event: 'provider_price_obtained', provider: 'amazon', productId, price }, 'Price obtained from Amazon');
    return price;
  } catch (error) {
    logger.error({ event: 'provider_scrape_failed', provider: 'amazon', productId, error }, 'Amazon scrape failed');
    throw error;
  } finally {
    await context.close();
  }
};