import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const scraperRoot = path.resolve(__dirname, '..');
const logFilePath = process.env.SCRAPER_LOG_FILE ?? path.join(scraperRoot, 'logs', 'scraper-info.log');

fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

const destination = pino.destination({
  dest: logFilePath,
  mkdir: true,
  sync: true,
});

export const logger = pino(
  {
    base: {
      service: 'scoopy-scraper',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  destination,
);
