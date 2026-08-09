import { UUID } from 'crypto';
import { openScraperIncidentIfNeeded, resolveOpenScraperIncident } from './postgres';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

export async function markScraperIncidentOpen(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<boolean> {
  return openScraperIncidentIfNeeded({
    provider_id: input.provider_id,
    product_id: input.product_id,
  });
}

export async function markScraperIncidentResolved(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<boolean> {
  return resolveOpenScraperIncident({
    provider_id: input.provider_id,
    product_id: input.product_id,
  });
}

export async function tryMarkScraperIncidentOpen(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<boolean> {
  try {
    return await markScraperIncidentOpen(input);
  } catch (error) {
    logger.warn({
      event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
      provider_id: Number(input.provider_id),
      product_id: input.product_id,
      error: normalizeLogError(error),
    }, 'Unable to store scraper incident');
    return false;
  }
}

export async function tryMarkScraperIncidentResolved(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<boolean> {
  try {
    return await markScraperIncidentResolved(input);
  } catch (error) {
    logger.warn({
      event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
      provider_id: Number(input.provider_id),
      product_id: input.product_id,
      error: normalizeLogError(error),
    }, 'Unable to resolve scraper incident');
    return false;
  }
}
