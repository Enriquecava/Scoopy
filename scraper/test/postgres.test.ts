import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  closeDatabase, createOrKeepOpenScraperIncident, getProducts, getProductsBySSN,
  resolveOpenScraperIncident, upsertProductPrice,
} from '../function/postgres';

if (!process.env.PGDATABASE?.endsWith('_test')) {
  throw new Error('Scraper database tests require an isolated database ending in _test');
}

const pool = new Pool();
const productId = randomUUID();
const ssn = `test-${randomUUID()}`;
let providerIds: string[] = [];
let listingIds: string[] = [];
let unitId: string | undefined;

before(async () => {
  const providers = await pool.query<{ id: string }>(
    `INSERT INTO providers (name, url, created_at, updated_at)
     VALUES ('test provider one', 'https://example.test', NOW(), NOW()),
            ('test provider two', 'https://example.test', NOW(), NOW()) RETURNING id`,
  );
  providerIds = providers.rows.map((row) => row.id);
  await pool.query('INSERT INTO products (id, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())', [productId, 'test product']);
  const unit = await pool.query<{ id: string }>('INSERT INTO units (value, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id', [Math.floor(Math.random() * 90_000_000_000) + 10_000_000_000]);
  unitId = unit.rows[0].id;
  const measure = await pool.query<{ id: string }>('INSERT INTO unit_measures (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id', [`measure-${productId}`]);
  const presentations = await pool.query<{ id: string }>(
    `INSERT INTO product_presentations (product_id, unit_id, unit_measure_id, created_at, updated_at)
     VALUES ($1, NULL, NULL, NOW(), NOW()), ($1, $2, $3, NOW(), NOW()) RETURNING id`,
    [productId, unit.rows[0].id, measure.rows[0].id],
  );
  const listings = await pool.query<{ id: string }>(
    `INSERT INTO providers_products (product_id, provider_id, product_presentation_id, ssn, created_at, updated_at)
     VALUES ($1, $2, $3, $6, NOW(), NOW()), ($1, $2, $4, $7, NOW(), NOW()),
            ($1, $5, $3, $6, NOW(), NOW()) RETURNING id`,
    [productId, providerIds[0], presentations.rows[0].id, presentations.rows[1].id, providerIds[1], ssn, `${ssn}-second`],
  );
  listingIds = listings.rows.map((row) => row.id);
});

after(async () => {
  try {
    await pool.query('DELETE FROM scraper_incidents WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM price_histories WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM providers_products WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM product_presentations WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    if (unitId) await pool.query('DELETE FROM units WHERE id = $1', [unitId]);
    await pool.query('DELETE FROM unit_measures WHERE name = $1', [`measure-${productId}`]);
    await pool.query('DELETE FROM providers WHERE id = ANY($1::bigint[])', [providerIds]);
  } finally {
    await pool.end();
    await closeDatabase();
  }
});

test('batch queries, prices and incidents preserve the exact listing', async () => {
  const listings = (await getProducts()).filter((row) => row.product_id === productId);
  assert.equal(listings.length, 3);
  await upsertProductPrice({ providers_product_id: listingIds[0], price: 10, currency: 'EUR' });
  await upsertProductPrice({ providers_product_id: listingIds[1], price: 20, currency: 'EUR' });
  const prices = await pool.query<{ providers_product_id: string; product_presentation_id: string }>(
    'SELECT providers_product_id, product_presentation_id FROM price_histories WHERE product_id = $1 ORDER BY price', [productId],
  );
  assert.deepEqual(prices.rows.map((row) => row.providers_product_id), listingIds.slice(0, 2));
  assert.notEqual(prices.rows[0].product_presentation_id, prices.rows[1].product_presentation_id);
  assert.equal(await createOrKeepOpenScraperIncident({ providers_product_id: listingIds[0] }), true);
  assert.equal(await createOrKeepOpenScraperIncident({ providers_product_id: listingIds[1] }), true);
  assert.equal(await createOrKeepOpenScraperIncident({ providers_product_id: listingIds[0] }), false);
  assert.equal(await resolveOpenScraperIncident({ providers_product_id: listingIds[0] }), true);
  const open = await pool.query('SELECT id FROM scraper_incidents WHERE product_id = $1 AND status = $2', [productId, 'open']);
  assert.equal(open.rowCount, 1);
  await assert.rejects(() => getProductsBySSN(ssn), /ambiguous/);
  assert.equal((await getProductsBySSN(ssn, Number(providerIds[0])))?.providers_product_id, listingIds[0]);
});
