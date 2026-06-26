import { chromium } from '@playwright/test';
import { HomePage } from '../page/homePage';
import { SearchListPage } from '../page/searchListPage';
import { CookiesPage } from '../page/cookiesPage';
import { upsertProductPrice } from './postgres';
import { parsePriceToEuros } from './common';

async function main(asin: string) {
  if (!asin || asin.trim() === '') {
    console.error('ASIN is required');
    return;
  }

  const browser = await chromium.launch({
    headless: false,
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.amazon.es/');

    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    const cookiesPage = new CookiesPage(page);
    await cookiesPage.clickAcceptButton();
    await homePage.searchForAsing(asin);

    const rawPrice = await searchListPage.priceItem(asin);
    const price = parsePriceToEuros(rawPrice);

    await upsertProductPrice({
      asin,
      productName: asin,
      price,
      currency: 'EUR',
    });

    console.log(`Precio guardado para ${asin}: ${price} EUR`);
  } finally {
    await browser.close();
  }
}

main(process.argv[2]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

