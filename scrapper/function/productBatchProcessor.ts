import { scrapeAndStoreProductPrice } from './productProcessor';
import { getProducts } from './postgres';

export async function processProductsFromDatabase(): Promise<void> {
  const result = await getProducts();

  for (const asin of result) {
    try {
      await scrapeAndStoreProductPrice(asin);
    } catch (error) {
      console.error(`Error processing ${asin}:`, error);
    }
  }
}

if (require.main === module) {
  processProductsFromDatabase().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}