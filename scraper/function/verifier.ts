import { logger, VERIFIER_LOG_EVENT } from '../utils/logger';
import {
  AMAZON_PROVIDER_ID,
  CARREFOUR_PROVIDER_ID,
  DRUNI_PROVIDER_ID,
  EL_CORTE_INGLES_PROVIDER_ID,
  PRIMOR_PROVIDER_ID,
} from '../utils/providers';
import { chromium } from '@playwright/test';
import { VerifierFn } from '../utils/types';
import { getProviderUrl } from './postgres';
import { amazonVerifier } from '../verifier/amazon';
import { carrefourVerifier } from '../verifier/carrefour';
import { druniVerifier } from '../verifier/druni';
import { elCorteInglesVerifier } from '../verifier/elCorteIngles';
import { primorVerifier } from '../verifier/primor';
import fs from 'node:fs/promises';
import path from 'node:path';

const verifie: Record<number, VerifierFn> = {
  [AMAZON_PROVIDER_ID]: amazonVerifier,
  [CARREFOUR_PROVIDER_ID]:carrefourVerifier,
  [DRUNI_PROVIDER_ID]:druniVerifier,
  [EL_CORTE_INGLES_PROVIDER_ID]: elCorteInglesVerifier,
  [PRIMOR_PROVIDER_ID]: primorVerifier,
};

export async function verifyProductExist(
  provider_id: number,
  ssn: string,
): Promise<string> {
  if (!ssn || ssn.trim() === '') {
    logger.warn(
      { event: VERIFIER_LOG_EVENT.INVALID_PRODUCT_INPUT, ssn, provider_id },
      'SSN is required',
    );
    throw new Error('SSN is required');
  }
  const verifier = verifie[provider_id];
  if (!verifier) {
    logger.error(
      { event: VERIFIER_LOG_EVENT.UNSUPPORTED_PROVIDER, provider_id, ssn },
      'Unsupported provider requested',
    );
    throw new Error(`Unsupported provider_id: ${provider_id}`);
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'es-ES,es;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    const url = await getProviderUrl(provider_id);
    const result = await verifier({ context, productId: ssn, url });

    const screenshotDir = path.resolve(process.cwd(), 'scraper', 'tmp', 'screenshot');
    await fs.mkdir(screenshotDir, { recursive: true });

    const sanitizedSsn = String(ssn).trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
    const fileName = `screenshot_${provider_id}_${sanitizedSsn}_${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);
    await fs.writeFile(filePath, result);

    return fileName;
  } catch (error) {
    logger.error(
      {
        event: VERIFIER_LOG_EVENT.VERIFICATION_FAILED,
        provider_id,
        ssn,
        error,
      },
      'Verification failed',
    );
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

