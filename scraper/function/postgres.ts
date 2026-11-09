import { Pool } from 'pg';
import 'dotenv/config';
import { UUID } from 'crypto';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false,
});

function parseProviderId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid provider ID: ${value}`);
  return id;
}

export interface UpsertPriceInput {
  providers_product_id: string;
  price: number;
  currency: string;
  updated_at?: Date;
  created_at?: Date;
}

export async function getProducts(): Promise<
  {
    ssn: string;
    provider_id: number;
    product_id: UUID;
    providers_product_id: string;
    product_presentation_id: string;
    url: string;
  }[]
> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      ssn: string;
      provider_id: string;
      product_id: UUID;
      providers_product_id: string;
      product_presentation_id: string;
      url: string
    }>(
      'SELECT pp.ssn, pp.provider_id, pp.product_id, pp.id AS providers_product_id, pp.product_presentation_id, p.url FROM providers_products AS pp JOIN providers AS p ON pp.provider_id = p.id',
    );
    return result.rows.map((row) => ({ ...row, provider_id: parseProviderId(row.provider_id) }));
  } finally {
    client.release();
  }
}

export async function getProductsBySSN(ssn: string, providerId?: number): Promise<{
  ssn: string;
  provider_id: number;
  product_id: UUID;
  providers_product_id: string;
  product_presentation_id: string;
  url: string;
} | null> {
  const client = await pool.connect();

  try {
    const result = await client.query<{
      ssn: string;
      provider_id: string;
      product_id: UUID;
      providers_product_id: string;
      product_presentation_id: string;
      url: string;
    }>(
      `
    SELECT 
      pp.ssn,
      pp.provider_id,
      pp.product_id,
      pp.id AS providers_product_id,
      pp.product_presentation_id,
      p.url
    FROM providers_products as pp
    JOIN providers as p
    ON pp.provider_id = p.id
    WHERE ssn = $1 AND ($2::bigint IS NULL OR pp.provider_id = $2)
    LIMIT 2;
    `,
      [ssn, providerId ?? null],
    );

    if (result.rows.length > 1) {
      throw new Error(`SSN is ambiguous across providers: ${ssn}. Specify a provider ID.`);
    }
    const row = result.rows[0];
    return row ? { ...row, provider_id: parseProviderId(row.provider_id) } : null;
  } finally {
    client.release();
  }
}
export async function getProviderUrl(provider_id: number): Promise<string | null> {
  const client = await pool.connect();

  try {
    const result = await client.query<{ url: string }>(
      'SELECT url FROM providers WHERE id = $1 LIMIT 1',
      [provider_id],
    );

    return result.rows[0]?.url || null;
  } finally {
    client.release();
  }
}

export async function upsertProductPrice(
  input: UpsertPriceInput,
): Promise<void> {
  const {
    providers_product_id,
    price,
    currency = 'EUR',
    updated_at = new Date(),
    created_at = new Date(),
  } = input;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO price_histories (provider_id, product_id, providers_product_id, product_presentation_id, price, currency, updated_at, created_at)
       SELECT provider_id, product_id, id, product_presentation_id, $2, $3, $4, $5
       FROM providers_products WHERE id = $1 FOR SHARE`,
      [providers_product_id, price, currency, updated_at, created_at],
    );

    if (result.rowCount !== 1) throw new Error(`Provider listing not found: ${providers_product_id}`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createOrKeepOpenScraperIncident(input: {
  providers_product_id: string;
}): Promise<boolean> {
  const { providers_product_id } = input;
  const client = await pool.connect();

  try {
    const result = await client.query<{ id: string }>(
      `INSERT INTO scraper_incidents (provider_id, product_id, providers_product_id, product_presentation_id, status, created_at, updated_at)
       SELECT provider_id, product_id, id, product_presentation_id, 'open', NOW(), NOW()
       FROM providers_products WHERE id = $1 FOR SHARE
       ON CONFLICT (providers_product_id) WHERE status = 'open' AND providers_product_id IS NOT NULL
       DO NOTHING
       RETURNING id;`,
      [providers_product_id],
    );

    if (result.rowCount === 0) {
      const listing = await client.query('SELECT 1 FROM providers_products WHERE id = $1', [providers_product_id]);
      if (listing.rowCount === 0) throw new Error(`Provider listing not found: ${providers_product_id}`);
    }
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function resolveOpenScraperIncident(input: {
  providers_product_id: string;
}): Promise<boolean> {
  const { providers_product_id } = input;
  const client = await pool.connect();

  try {
    const result = await client.query<{ id: string }>(
      `UPDATE scraper_incidents
       SET status = 'resolved', updated_at = NOW()
       WHERE providers_product_id = $1 AND status = 'open'
       RETURNING id;`,
      [providers_product_id],
    );

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }

}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
