import { parsePriceToEuros } from '../function/common';
import { CookiesPage } from '../page/amazon/cookiesPage';
import { HomePage } from '../page/amazon/homePage';
import { SearchListPage } from '../page/amazon/searchListPage';
import { ScraperFn } from '../utils/types';

export const amazonScraper: ScraperFn = async ({context,productId }) => {

  try {
    const page = await context.newPage();
    await page.goto('https://www.amazon.es/');

    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    const cookiesPage = new CookiesPage(page);

    await cookiesPage.clickAcceptButton();
    await homePage.searchForAsin(productId);

    const rawPrice = await searchListPage.priceItem(productId);
    return parsePriceToEuros(rawPrice);
  } finally {
    await context.close();
  }
};