import { UUID } from 'crypto';
import { createOrKeepOpenScraperIncident, findOpenScraperIncident, resolveOpenScraperIncident } from './postgres';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

export async function openScraperIncident(input: {
  provider_id: number;
  product_id: UUID;
  asin: string;
}): Promise<boolean> {
  const { provider_id, product_id, asin } = input;

  const alreadyOpen = await findOpenScraperIncident({ provider_id, product_id });

  if (alreadyOpen) {
    logger.info({
      event: LOG_EVENT.SCRAPER_INCIDENT_ALREADY_OPEN,
      provider_id,
      product_id,
      asin,
    }, 'Scraper incident already open; skipping creation');
    return false;
  }

  const created = await createOrKeepOpenScraperIncident({ provider_id, product_id });

  if (created) {
    logger.warn({
      event: LOG_EVENT.SCRAPER_INCIDENT_OPENED,
      provider_id,
      product_id,
      asin,
    }, 'Scraper incident opened for provider/product');
    return true;
  }

  logger.info({
    event: LOG_EVENT.SCRAPER_INCIDENT_ALREADY_OPEN,
    provider_id,
    product_id,
    asin,
  }, 'Scraper incident already existed and remained open');

  return false;
}

export async function closeScraperIncident(input: {
  provider_id: number;
  product_id: UUID;
  asin: string;
}): Promise<boolean> {
  const { provider_id, product_id, asin } = input;

  const hasOpenIncident = await findOpenScraperIncident({ provider_id, product_id });

  if (!hasOpenIncident) {
    logger.info({
      event: LOG_EVENT.SCRAPER_INCIDENT_NO_OPEN,
      provider_id,
      product_id,
      asin,
    }, 'No open scraper incident to resolve');
    return false;
  }

  const resolved = await resolveOpenScraperIncident({ provider_id, product_id });

  if (resolved) {
    logger.info({
      event: LOG_EVENT.SCRAPER_INCIDENT_RESOLVED,
      provider_id,
      product_id,
      asin,
    }, 'Scraper incident resolved');
    return true;
  }

  logger.warn({
    event: LOG_EVENT.SCRAPER_INCIDENT_NO_OPEN,
    provider_id,
    product_id,
    asin,
    error: normalizeLogError(new Error('Open incident disappeared before update')),
  }, 'Open scraper incident could not be resolved');

  return false;
}
