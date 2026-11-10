import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, Browser, BrowserContext } from '@playwright/test';

const baseUrl = process.env.FRONTEND_TEST_URL;
if (!baseUrl) throw new Error('Set FRONTEND_TEST_URL to an isolated frontend server');

let browser: Browser;
let context: BrowserContext;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await context?.close(); await browser?.close(); });

async function openProduct(role: 'user' | 'admin', emptyAfterDelete = false) {
  let deleted = false;
  let submittedListing: Record<string, unknown> | undefined;
  context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript((userRole) => {
    sessionStorage.setItem('scoopy:token', 'test-token');
    sessionStorage.setItem('scoopy:role', userRole);
    localStorage.setItem('scoopy:locale', 'es');
  }, role);
  const page = await context.newPage();
  await page.route('http://localhost:3000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (emptyAfterDelete && path === '/products/example/presentations/1' && route.request().method() === 'DELETE') {
      deleted = true;
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
      return;
    }
    if (emptyAfterDelete && path === '/products/example/provider_listings' && route.request().method() === 'POST') {
      submittedListing = route.request().postDataJSON().listing;
      await route.fulfill({ status: 201, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
      return;
    }
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
    if (emptyAfterDelete) {
      product.presentations = deleted ? [] : product.presentations.slice(0, 1);
      product.providers_products = [];
    }
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
  if (!emptyAfterDelete) await page.getByText('SSN: FIRST').waitFor();
  else await page.getByRole('button', { name: 'Añadir anuncio' }).waitFor();
  return { page, submittedListing: () => submittedListing };
}

test('regular users see only the selected presentation and cannot edit', async () => {
  const { page } = await openProduct('user');
  assert.equal(await page.getByText('Gestionar producto').count(), 0);
  assert.equal(await page.getByText('SSN: SECOND').count(), 0);
  await page.getByLabel('Presentación').selectOption('2');
  assert.equal(await page.getByText('SSN: FIRST').count(), 0);
  assert.equal(await page.getByText('SSN: SECOND').count(), 1);
  assert.match(await page.locator('article').innerText(), /10,00/);
  await context.close();
});

test('administrators can see the product management controls', async () => {
  const { page } = await openProduct('admin');
  assert.equal(await page.getByText('Gestionar producto').count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Añadir anuncio' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Editar producto' }).count(), 1);
  await context.close();
});

test('administrators can add a listing after deleting the last presentation', async () => {
  const { page, submittedListing } = await openProduct('admin', true);
  page.on('dialog', (dialog) => dialog.accept());
  const presentationEditor = page.locator('form').filter({ has: page.getByRole('button', { name: 'Guardar' }) }).filter({ has: page.locator('input[type="number"]') });
  await presentationEditor.locator('select').first().selectOption('1');
  await presentationEditor.getByRole('button', { name: 'Eliminar' }).click();
  await page.waitForLoadState('load');
  const listingForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Añadir anuncio' }) });
  await listingForm.locator('select').first().selectOption('1');
  await listingForm.locator('input').fill('NEW-LISTING');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/provider_listings') && response.request().method() === 'POST'),
    listingForm.getByRole('button', { name: 'Añadir anuncio' }).click(),
  ]);
  assert.deepEqual(submittedListing(), { provider_id: '1', ssn: 'NEW-LISTING', product_presentation_id: null });
  await context.close();
});
