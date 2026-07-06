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
  provider_id: bigint;
  product_id: UUID;
  price: number;
  currency: string;
  updated_at?: Date;
  created_at?: Date;
}

export async function getProducts(): Promise<{ ssn: string, provider_id: bigint, product_id: UUID }[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ ssn: string, provider_id: bigint, product_id: UUID }>('SELECT ssn, provider_id, product_id FROM providers_products');
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getProductsBySSN(ssn: string): Promise<{ ssn: string, provider_id: bigint, product_id: UUID } | null> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ ssn: string, provider_id: bigint, product_id: UUID }>(
      'SELECT ssn, provider_id, product_id FROM providers_products WHERE ssn = $1',
      [ssn]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function upsertProductPrice(input: UpsertPriceInput): Promise<void> {
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
      [provider_id, product_id, price, currency, updated_at, created_at]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
