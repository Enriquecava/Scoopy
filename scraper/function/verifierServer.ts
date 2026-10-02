import http from 'node:http';
import { verifyProductExist } from './verifier';
import { VERIFIER_LOG_EVENT, logger, normalizeLogError } from '../utils/logger';

const PORT = Number(process.env.VERIFIER_PORT ?? 4000);

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/verify') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  readBody(req)
    .then(async (raw) => {
      const body = JSON.parse(raw || '{}');
      const providerId = Number(body.provider_id);
      const ssn = String(body.ssn ?? '');

      const fileName = await verifyProductExist(providerId, ssn);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ file_name: fileName }));
    })
    .catch((error) => {
      logger.error(
        { event: VERIFIER_LOG_EVENT.REQUEST_FAILED, error: normalizeLogError(error) },
        'Verifier request failed',
      );
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Verification failed' }));
    });
});

server.listen(PORT, () => {
  logger.info({ event: VERIFIER_LOG_EVENT.SERVER_STARTED, port: PORT }, 'Verifier server started');
});

process.on('SIGTERM', () => {
  server.close();
});
