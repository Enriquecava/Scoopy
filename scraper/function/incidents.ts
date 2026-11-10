import { UUID } from 'crypto';
import { createOrKeepOpenScraperIncident, resolveOpenScraperIncident, ListingSnapshot } from './postgres';
import { LOG_EVENT, logger } from '../utils/logger';

export async function openScraperIncident(input: ListingSnapshot & {
  provider_id: number;
  product_id: UUID;
  providers_product_id: string;
  asin: string;
}): Promise<boolean> {
  const { provider_id, product_id, providers_product_id, asin } = input;

  const created = await createOrKeepOpenScraperIncident(input);

  if (created) {
    logger.warn({
      event: LOG_EVENT.SCRAPER_INCIDENT_OPENED,
      provider_id,
      product_id,
      asin,
    }, 'Scraper incident opened for provider/product');
  } else {
    logger.info({
      event: LOG_EVENT.SCRAPER_INCIDENT_ALREADY_OPEN,
      provider_id,
      product_id,
      asin,
    }, 'Scraper incident already open; skipping creation');
  }

  return created;
}

export async function closeScraperIncident(input: ListingSnapshot & {
  provider_id: number;
  product_id: UUID;
  providers_product_id: string;
  asin: string;
}): Promise<boolean> {
  const { provider_id, product_id, providers_product_id, asin } = input;

  const resolved = await resolveOpenScraperIncident(input);

  if (resolved) {
    logger.info({
      event: LOG_EVENT.SCRAPER_INCIDENT_RESOLVED,
      provider_id,
      product_id,
      asin,
    }, 'Scraper incident resolved');
  } else {
    logger.info({
      event: LOG_EVENT.SCRAPER_INCIDENT_NO_OPEN,
      provider_id,
      product_id,
      asin,
    }, 'No open scraper incident to resolve');
  }

  return resolved;
}
