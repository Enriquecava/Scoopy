import { getProductsBySSN, upsertProductPrice } from './postgres';
import { amazonScrapper } from '../providers/amazon';

export type Provider = 'amazon'

export type ScraperInput = {
  productId: string; // asin, sku, ean...
};

export type ScraperFn = (input: ScraperInput) => Promise<number>;

const scrappers: Record<Provider, ScraperFn> = {
  amazon: amazonScrapper,
};

export async function scrapeAndStoreProductPrice(asin: string, provider: string): Promise<number> {
  if (!asin || asin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const scrapper = scrappers[provider];
  return scrapper({productId: asin });


}

async function runFromCli(asin?: string): Promise<void> {
  const targetAsin = asin ?? process.argv[2];

  if (!targetAsin || targetAsin.trim() === '') {
    throw new Error('ASIN is required');
  }
  const products = await getProductsBySSN(targetAsin);

  const price =await scrapeAndStoreProductPrice(products.ssn,products.provider_name);

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

