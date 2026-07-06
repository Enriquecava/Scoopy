import { chromium } from '@playwright/test';
import { HomePage } from '../page/homePage';
import { SearchListPage } from '../page/searchListPage';
import { CookiesPage } from '../page/cookiesPage';
import { getProductsBySSN, upsertProductPrice } from './postgres';
import { parsePriceToEuros } from './common';

export async function scrapeAndStoreProductPrice(asin: string): Promise<number> {
  if (!asin || asin.trim() === '') {
    throw new Error('ASIN is required');
  }

  const browser = await chromium.launch({
    headless: true,
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
    console.log('Price for ASIN', asin, ':', price, 'EUR');
    return price

  } finally {
    await browser.close();
  }
}

async function runFromCli(asin?: string): Promise<void> {
  const targetAsin = asin ?? process.argv[2];

  if (!targetAsin || targetAsin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const products = await getProductsBySSN(targetAsin);

  const price =await scrapeAndStoreProductPrice(products.ssn);

  await upsertProductPrice({
    provider_id: products.provider_id,
    product_id: products.product_id,
    price,
    currency: 'EUR',
  });
  console.log(`Price saved for ${products.ssn}: ${price} EUR`);
}

if (require.main === module) {
  runFromCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

