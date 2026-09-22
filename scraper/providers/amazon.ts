import { parsePriceToEuros } from '../function/common';
import { CookiesPage } from '../page/amazon/cookiesPage';
import { HomePage } from '../page/amazon/homePage';
import { SearchListPage } from '../page/amazon/searchListPage';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';
import { ScraperFn } from '../utils/types';

export const amazonScraper: ScraperFn = async ({context,productId,url }) => {

  try {
    logger.info({ event: LOG_EVENT.PROVIDER_SCRAPE_STARTED, provider: 'amazon', productId }, 'Starting Amazon scrape');

    const page = await context.newPage();
    await page.goto(url);

    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    const cookiesPage = new CookiesPage(page);

    await cookiesPage.clickAcceptButton();
    await homePage.searchForAsin(productId);
    try{
      const isAvailable = await searchListPage.isItemAvailable(productId);
      if (!isAvailable) {
        throw new Error(`Item with ASIN: ${productId} is not available`);
      }
    } catch (error) {
      throw error;
    }
    try {
      const isPriceAvailable = await searchListPage.isPriceAvailable(productId);
      if (!isPriceAvailable) {
        throw new Error(`Price for item with ASIN: ${productId} is not available`);
      }
    } catch (error) {
      throw error;
    }

    const rawPrice = await searchListPage.priceItem(productId);
    const price = parsePriceToEuros(rawPrice);

    logger.info({ event: LOG_EVENT.PROVIDER_PRICE_OBTAINED, provider: 'amazon', productId, price }, 'Price obtained from Amazon');
    return price;
  } catch (error) {
    logger.error({ event: LOG_EVENT.PROVIDER_SCRAPE_FAILED, provider: 'amazon', productId, error: normalizeLogError(error) }, 'Amazon scrape failed');
    throw error;
  }
};