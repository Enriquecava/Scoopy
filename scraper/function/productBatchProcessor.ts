import { scrapeAndStoreProductPrice } from './productProcessor';
import { getProducts, upsertProductPrice } from './postgres';
import { chromium } from '@playwright/test';

const headless = process.env.PLAYWRIGHTHEADLESS === 'True' ? true : false;

export async function processProductsFromDatabase(): Promise<void> {
  const result = await getProducts();
  const browser = await chromium.launch({ headless: headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
    ],
   });

  try {
    for (const { ssn, provider_id, product_id } of result) {
      try {
        const price = await scrapeAndStoreProductPrice(
          browser,
          ssn,
          provider_id,
        );
        await upsertProductPrice({
          provider_id,
          product_id,
          price,
          currency: 'EUR',
        });
        console.log(`Price saved for ${ssn}: ${price} EUR`);
      } catch (error) {
        console.error(`Error processing ${ssn}:`, error);
      }
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  processProductsFromDatabase().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
