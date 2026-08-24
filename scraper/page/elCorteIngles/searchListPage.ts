import { Page, Locator } from '@playwright/test';

export class SearchListPage {
  private page: Page;
  readonly item: Locator;
  readonly product:Locator

  constructor(page: Page) {
    this.page = page;
    this.item = page.locator('[aria-label="Precio de venta"]').first()
    this.product = page.locator('[data-synth="LOCATOR_PRODUCT_PREVIEW_LIST"]').first()
  }

  async clickItem() {
    await this.item.click();
  }

  async getItemImage(): Promise<Buffer> {
    const image = await this.product.screenshot();
    if (!image) {
      throw new Error(`Image not found`);
    }
    return image;
  }

  async priceItem(): Promise<string> {
    const price = await this.item.textContent();
    if (price === null) {
      throw new Error(`Price not found`);
    }

    return price;
  }
}
