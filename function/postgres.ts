import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false,
});

export interface UpsertPriceInput {
  asin: string;
  productName: string;
  price: number;
  currency?: string;
  observedAt?: Date;
}

export async function getProducts(): Promise<string[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ asin: string }>('SELECT asin FROM products');
    return result.rows.map((row) => row.asin);
  } finally {
    client.release();
  }
}

export async function upsertProductPrice(input: UpsertPriceInput): Promise<void> {
  const {
    asin,
    productName,
    price,
    currency = 'EUR',
    observedAt = new Date(),
  } = input;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO products (asin, product_name)
       VALUES ($1, $2)
       ON CONFLICT (asin) DO NOTHING`,
      [asin, productName || asin]
    );

    await client.query(
      `INSERT INTO price_history (product_asin, price, currency, observed_at)
       VALUES ($1, $2, $3, $4)`,
      [asin, price, currency, observedAt]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
