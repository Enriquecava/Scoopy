import { chromium } from '@playwright/test';
import { parsePriceToEuros } from '../function/common';
import { CookiesPage } from '../page/amazon/cookiesPage';
import { HomePage } from '../page/amazon/homePage';
import { SearchListPage } from '../page/amazon/searchListPage';
import { ScraperFn } from '../utils/types';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

export const amazonScrapper: ScraperFn = async ({productId }) => {
  const browser = await chromium.launch({ headless: headless });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.amazon.es/');

    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    const cookiesPage = new CookiesPage(page);

    await cookiesPage.clickAcceptButton();
    await homePage.searchForAsing(productId);

    const rawPrice = await searchListPage.priceItem(productId);
    return parsePriceToEuros(rawPrice);
  } finally {
    await browser.close();
  }
};