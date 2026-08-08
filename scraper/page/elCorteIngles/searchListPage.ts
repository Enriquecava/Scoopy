import { Page, Locator } from '@playwright/test';

export class SearchListPage {
  private page: Page;
  readonly item: Locator;

  constructor(page: Page) {
    this.page = page;
    this.item = page.locator('[aria-label="Precio de venta"]').first()
  }

  async clickItem() {
    await this.item.click();
  }

  async priceItem(): Promise<string> {
    const price = await this.item.textContent();
    if (price === null) {
      throw new Error(`Price not found`);
    }

    return price;
  }
}
