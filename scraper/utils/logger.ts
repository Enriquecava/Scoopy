import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

export const LOG_EVENT = {
  PROVIDER_SCRAPE_STARTED: 'scraper.provider.started',
  PROVIDER_PRICE_OBTAINED: 'scraper.provider.price_obtained',
  PROVIDER_SCRAPE_FAILED: 'scraper.provider.failed',
  PRODUCT_PRICE_SAVED: 'scraper.product.price_saved',
  PRODUCT_PROCESSING_FAILED: 'scraper.product.processing_failed',
  BATCH_PROCESSING_FAILED: 'scraper.batch.failed',
  INVALID_PRODUCT_INPUT: 'scraper.input.invalid_product',
  INVALID_CLI_INPUT: 'scraper.input.invalid_cli',
  PRODUCT_NOT_FOUND: 'scraper.product.not_found',
  UNSUPPORTED_PROVIDER: 'scraper.provider.unsupported',
  CLI_RUN_FAILED: 'scraper.cli.failed',
} as const;

export function normalizeLogError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

const scraperRoot = path.resolve(__dirname, '..');
const configuredLogFile = process.env.SCRAPER_LOG_FILE;
const logFilePath = configuredLogFile
  ? path.resolve(configuredLogFile)
  : undefined;

if (logFilePath) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

const transport = logFilePath
  ? pino.destination({
      dest: logFilePath,
      mkdir: true,
      sync: false,
    })
  : undefined;

export const logger = pino(
  {
    base: {
      service: 'scoopy-scraper',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: [
      'password',
      'token',
      'cookie',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
    ],
  },
  transport,
);

export function flushLogger(): void {
  if (transport && typeof (transport as { flushSync?: () => void }).flushSync === 'function') {
    (transport as { flushSync: () => void }).flushSync();
  }
}

export function closeLogger(): void {
  if (transport && typeof (transport as { flushSync?: () => void }).flushSync === 'function') {
    (transport as { flushSync: () => void }).flushSync();
  }
  if (typeof (logger as { flush?: () => void }).flush === 'function') {
    (logger as { flush: () => void }).flush();
  }
}
