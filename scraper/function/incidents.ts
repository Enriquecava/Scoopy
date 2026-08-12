import { UUID } from 'crypto';
import { createOrKeepOpenScraperIncident, resolveOpenScraperIncident } from './postgres';
import { LOG_EVENT, logger } from '../utils/logger';

export async function openScraperIncident(input: {
  provider_id: number;
  product_id: UUID;
  asin: string;
}): Promise<boolean> {
  const { provider_id, product_id, asin } = input;

  const created = await createOrKeepOpenScraperIncident({ provider_id, product_id });

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

export async function closeScraperIncident(input: {
  provider_id: number;
  product_id: UUID;
  asin: string;
}): Promise<boolean> {
  const { provider_id, product_id, asin } = input;

  const resolved = await resolveOpenScraperIncident({ provider_id, product_id });

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
