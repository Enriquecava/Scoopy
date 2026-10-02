import { logger, VERIFIER_LOG_EVENT } from '../utils/logger';
import {
  AMAZON_PROVIDER_ID,
  CARREFOUR_PROVIDER_ID,
  DRUNI_PROVIDER_ID,
  EL_CORTE_INGLES_PROVIDER_ID,
  PRIMOR_PROVIDER_ID,
} from '../utils/providers';
import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { VerifierFn } from '../utils/types';
import { getProviderUrl } from './postgres';
import { amazonVerifier } from '../verifier/amazon';
import { carrefourVerifier } from '../verifier/carrefour';
import { druniVerifier } from '../verifier/druni';
import { elCorteInglesVerifier } from '../verifier/elCorteIngles';
import { primorVerifier } from '../verifier/primor';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const verifie: Record<number, VerifierFn> = {
  [AMAZON_PROVIDER_ID]: amazonVerifier,
  [CARREFOUR_PROVIDER_ID]:carrefourVerifier,
  [DRUNI_PROVIDER_ID]:druniVerifier,
  [EL_CORTE_INGLES_PROVIDER_ID]: elCorteInglesVerifier,
  [PRIMOR_PROVIDER_ID]: primorVerifier,
};

const VERIFIER_TIMEOUT_MS = Number(process.env.VERIFIER_TIMEOUT_MS ?? 25000);

function remainingMs(deadlineAt: number): number {
  return Math.max(0, deadlineAt - Date.now());
}

// Forces the browser closed when the deadline hits, so a hung launch/page/selector
// wait doesn't keep an orphaned Chromium process running after the caller gave up.
async function withDeadline<T>(promise: Promise<T>, deadlineAt: number, browser?: Browser): Promise<T> {
  let timer: NodeJS.Timeout;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const closeBrowser = browser ? browser.close().catch(() => undefined) : Promise.resolve();
      closeBrowser.finally(() => reject(new Error('Verification timed out')));
    }, remainingMs(deadlineAt));
  });

  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer!);
  }
}

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

  let browser: Browser | undefined;
  const deadlineAt = Date.now() + VERIFIER_TIMEOUT_MS;
  try {
    browser = await withDeadline(
      chromium.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
        ],
        timeout: remainingMs(deadlineAt),
      }),
      deadlineAt,
    );

    const context = await withDeadline(
      browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept-Language': 'es-ES,es;q=0.9',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      }),
      deadlineAt,
      browser,
    );
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    let url: string | null = null;
    try {
      url = await withDeadline(getProviderUrl(provider_id), deadlineAt, browser);
    } catch (error) {
      logger.error(
        {
          event: VERIFIER_LOG_EVENT.FAILED_TO_GET_PROVIDER_URL,
          provider_id,
          ssn,
          error,
        },
        'Failed to get provider URL',
      );
      throw error;
    }

    const result = await withDeadline(verifier({ context, productId: ssn, url }), deadlineAt, browser);

    // SCREENSHOT_DIR lets the containerized verifier server write to a path
    // shared (via a Docker volume) with the Rails API that serves the file.
    const isSharedScreenshotDir = Boolean(process.env.SCREENSHOT_DIR);
    const screenshotDir = process.env.SCREENSHOT_DIR
      ? path.resolve(process.env.SCREENSHOT_DIR)
      : path.resolve(process.cwd(), 'scraper', 'tmp', 'screenshot');
    await fs.mkdir(screenshotDir, { recursive: true });
    if (isSharedScreenshotDir) {
      await fs.chown(screenshotDir, 1000, 1000);
      await fs.chmod(screenshotDir, 0o755);
    }

    const fileName = `${crypto.randomUUID()}.png`;
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

