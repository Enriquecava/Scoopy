import { Page, Locator } from '@playwright/test';

export class SearchListPage {
  private page: Page;
  readonly priceSale :Locator;
  readonly priceRegular :Locator;

  constructor(page: Page) {
    this.page = page;
    this.priceSale = page.locator('[class="dfd-card-price dfd-card-price--sale"]')
    this.priceRegular = page.locator('[class="dfd-card-price"]')
  }


  async priceItem(): Promise<string> {
    let price: string | null;
    if (await this.priceSale.count() > 0) {
      price = await this.priceSale.first().textContent();
    }
    else{
      price = await this.priceRegular.first().textContent();
    }
    if (price === null) {
      throw new Error(`Price not found`);
    }

    return price;
  }
}
