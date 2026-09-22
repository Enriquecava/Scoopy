import { Page, Locator } from '@playwright/test';

export class SearchListPage {
  private page: Page;
  readonly item: (asin: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.item = (asin: string) => page.locator(`[data-asin="${asin}"][role="listitem"]`);
  }

  async clickItem(asin: string) {
    await this.item(asin).click();
  }
  async getItemImage(asin: string): Promise<Buffer> {
    await this.item(asin).first().waitFor();
    return await this.item(asin).first().screenshot();
  }
  async isItemAvailable(asin: string): Promise<boolean> {
    const itemLocator = this.item(asin).first();
    await itemLocator.waitFor();
    return await itemLocator.isVisible();
  }
  async isPriceAvailable(asin: string): Promise<boolean> {
    const itemLocator = this.item(asin).first();
    const priceLocator = itemLocator.locator('span[data-a-size="xl"][data-a-color="base"].a-price');
    return await priceLocator.isVisible();
  }

  async priceItem(asin: string): Promise<string> {
    const itemLocator = this.item(asin).first();
    const price = await itemLocator.locator('span[data-a-size="xl"][data-a-color="base"].a-price').textContent();

    if (price === null) {
      throw new Error(`Price not found for ASIN: ${asin}`);
    }

    return price;
  }
}
