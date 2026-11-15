import 'dotenv/config';

import { verifyProductExist } from './verifier';

async function main() {
  const providerId = Number(process.argv[2]);
  const ssn = process.argv[3];

  if (!providerId || !ssn) {
    console.error(
      'Uso: npm run debug:verifier -- <provider_id> <ssn>',
    );
    process.exit(1);
  }

  console.log('Iniciando verifier...');
  console.log({
    providerId,
    ssn,
    timeout: process.env.VERIFIER_TIMEOUT_MS,
  });

  try {
    const screenshot = await verifyProductExist(providerId, ssn);

    console.log('Verificación completada');
    console.log('Screenshot:', screenshot);
  } catch (error) {
    console.error('Error ejecutando verifier:', error);
  }
}

main();