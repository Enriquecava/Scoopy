import { parsePriceToEuros } from '../function/common';
import { CookiesPage } from '../page/carrefour/cookiesPage';
import { SearchListPage } from '../page/carrefour/searchListPage';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';
import { ScraperFn } from '../utils/types';
import { HomePage } from '../page/carrefour/homePage';

export const carrefourScraper: ScraperFn = async ({context,productId,url }) => {
  try{
    logger.info({ event: LOG_EVENT.PROVIDER_SCRAPE_STARTED, provider: 'carrefour', productId }, 'Starting Carrefour scrape');

    const page = await context.newPage();
    await page.goto(url);
    const homePage = new HomePage(page)
    const searchListPage = new SearchListPage(page)
    const cookiesPage = new CookiesPage(page)

    await cookiesPage.clickRejectButton()
    await page.waitForTimeout(500) // If done without this waits it crash
    await homePage.clickSearchBar()
    await page.waitForTimeout(500) // If done without this waits it crash
    await homePage.typeSearch(productId)
    await page.waitForTimeout(500) // If done without this waits it crash
    await homePage.clickSearchButton()

    const rawPrice = await searchListPage.priceItem()
    const price = parsePriceToEuros(rawPrice);

    logger.info({ event: LOG_EVENT.PROVIDER_PRICE_OBTAINED, provider: 'carrefour', productId, price }, 'Price obtained from Carrefour');
    return price;
  }
  catch (error) {
    logger.error({ event: LOG_EVENT.PROVIDER_SCRAPE_FAILED, provider: 'carrefour', productId, error: normalizeLogError(error) }, 'Carrefour scrape failed');
    throw error;
  }

}