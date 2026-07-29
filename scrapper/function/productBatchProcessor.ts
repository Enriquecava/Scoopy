import { scrapeAndStoreProductPrice } from './productProcessor';
import { getProducts, upsertProductPrice } from './postgres';

export async function processProductsFromDatabase(): Promise<void> {
  const result = await getProducts();

  for (const { ssn, provider_id, product_id } of result) {
    try {
      const price = await scrapeAndStoreProductPrice(ssn,provider_id);   
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
}

if (require.main === module) {
  processProductsFromDatabase().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}