import { UUID } from 'crypto';
import { hasOpenScraperIncident, resolveScraperIncidentStatus, upsertScraperIncidentStatus } from './postgres';
import { LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

export async function markScraperIncidentOpen(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<void> {
  const openIncidentExists = await hasOpenScraperIncident({
    provider_id: input.provider_id,
    product_id: input.product_id,
  });

  if (openIncidentExists) {
    return;
  }

  await upsertScraperIncidentStatus({
    provider_id: input.provider_id,
    product_id: input.product_id,
    status: 'open',
  });
}

export async function markScraperIncidentResolved(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<void> {
  await resolveScraperIncidentStatus({
    provider_id: input.provider_id,
    product_id: input.product_id,
  });
}

export async function tryMarkScraperIncidentOpen(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<void> {
  try {
    await markScraperIncidentOpen(input);
  } catch (error) {
    logger.warn({
      event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
      provider_id: Number(input.provider_id),
      product_id: input.product_id,
      error: normalizeLogError(error),
    }, 'Unable to store scraper incident');
  }
}

export async function tryMarkScraperIncidentResolved(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<void> {
  try {
    await markScraperIncidentResolved(input);
  } catch (error) {
    logger.warn({
      event: LOG_EVENT.PRODUCT_PROCESSING_FAILED,
      provider_id: Number(input.provider_id),
      product_id: input.product_id,
      error: normalizeLogError(error),
    }, 'Unable to resolve scraper incident');
  }
}
