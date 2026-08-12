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

export interface UpsertPriceInput {
  provider_id: number;
  product_id: UUID;
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
    url: string;
  }[]
> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      ssn: string;
      provider_id: number;
      product_id: UUID;
      url: string
    }>(
      'SELECT ssn, provider_id, product_id, p.url FROM providers_products AS pp JOIN providers AS p ON pp.provider_id = p.id',
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getProductsBySSN(ssn: string): Promise<{
  ssn: string;
  provider_id: number;
  product_id: UUID;
  url: string;
} | null> {
  const client = await pool.connect();

  try {
    const result = await client.query<{
      ssn: string;
      provider_id: number;
      product_id: UUID;
      url: string;
    }>(
      `
    SELECT 
      ssn,
      provider_id,
      product_id,
      p.url
    FROM providers_products as pp
    JOIN providers as p
    ON pp.provider_id = p.id
    WHERE ssn = $1
    LIMIT 1;
    `,
      [ssn],
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function upsertProductPrice(
  input: UpsertPriceInput,
): Promise<void> {
  const {
    provider_id,
    product_id,
    price,
    currency = 'EUR',
    updated_at = new Date(),
    created_at = new Date(),
  } = input;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO price_histories (providers_id, product_id, price, currency, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [provider_id, product_id, price, currency, updated_at, created_at],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createOrKeepOpenScraperIncident(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<boolean> {
  const { provider_id, product_id } = input;
  const client = await pool.connect();

  try {
    const result = await client.query<{ id: string }>(
      `INSERT INTO scraper_incidents (provider_id, product_id, status, created_at, updated_at)
       VALUES ($1, $2, 'open', NOW(), NOW())
       ON CONFLICT (provider_id, product_id) WHERE status = 'open'
       DO NOTHING
       RETURNING id;`,
      [provider_id, product_id],
    );

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function resolveOpenScraperIncident(input: {
  provider_id: number;
  product_id: UUID;
}): Promise<boolean> {
  const { provider_id, product_id } = input;
  const client = await pool.connect();

  try {
    const result = await client.query<{ id: string }>(
      `UPDATE scraper_incidents
       SET status = 'resolved', updated_at = NOW()
       WHERE provider_id = $1 AND product_id = $2 AND status = 'open'
       RETURNING id;`,
      [provider_id, product_id],
    );

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}
