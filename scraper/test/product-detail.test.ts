import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, Browser, BrowserContext } from '@playwright/test';

const baseUrl = process.env.FRONTEND_TEST_URL;
if (!baseUrl) throw new Error('Set FRONTEND_TEST_URL to an isolated frontend server');

let browser: Browser;
let context: BrowserContext;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await context?.close(); await browser?.close(); });

async function openProduct(role: 'user' | 'admin') {
  context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript((userRole) => {
    sessionStorage.setItem('scoopy:token', 'test-token');
    sessionStorage.setItem('scoopy:role', userRole);
    localStorage.setItem('scoopy:locale', 'es');
  }, role);
  const page = await context.newPage();
  await page.route('http://localhost:3000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const product = {
      id: 'example', name: 'Dodot', brand: null, category: null,
      presentations: [
        { id: 1, unit: null, unit_measure: null },
        { id: 2, unit: { value: '120' }, unit_measure: { name: 'pañales' } },
      ],
      providers_products: [
        { id: 11, provider_id: 1, provider_name: 'Amazon', ssn: 'FIRST', product_presentation_id: 1 },
        { id: 12, provider_id: 1, provider_name: 'Amazon', ssn: 'SECOND', product_presentation_id: 2 },
      ],
    };
    const history = {
      price_history: [
        { id: 1, price: '5', currency: 'EUR', created_at: '2026-01-01T00:00:00Z', provider_name: 'Amazon', provider_id: 1, providers_product_id: 11, product_presentation_id: 1 },
        { id: 2, price: '10', currency: 'EUR', created_at: '2026-01-01T00:00:00Z', provider_name: 'Amazon', provider_id: 1, providers_product_id: 12, product_presentation_id: 2 },
      ],
    };
    const data = path === '/products/example' ? product
      : path.endsWith('/price_history') ? history
        : path === '/providers' ? { data: [{ id: 1, name: 'Amazon' }] }
          : [];
    await route.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data),
    });
  });
  await page.goto(`${baseUrl}/products/example`);
  await page.getByText('SSN: FIRST').waitFor();
  return page;
}

test('regular users see only the selected presentation and cannot edit', async () => {
  const page = await openProduct('user');
  assert.equal(await page.getByText('Gestionar producto').count(), 0);
  assert.equal(await page.getByText('SSN: SECOND').count(), 0);
  await page.getByLabel('Presentación').selectOption('2');
  assert.equal(await page.getByText('SSN: FIRST').count(), 0);
  assert.equal(await page.getByText('SSN: SECOND').count(), 1);
  assert.match(await page.locator('article').innerText(), /10,00/);
  await context.close();
});

test('administrators can see the product management controls', async () => {
  const page = await openProduct('admin');
  assert.equal(await page.getByText('Gestionar producto').count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Añadir anuncio' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Editar producto' }).count(), 1);
});
