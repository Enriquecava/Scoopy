import { Page,Locator } from '@playwright/test';

export class SearchListPage {
  private page: Page;
  readonly item: (asin: string) => Locator;


  constructor(page: Page) {
    this.page = page;
    this.item = (asin: string) => page.locator(`[data-asin="${asin}"][role="listitem"]`);
  }
  
  async clickItem(asin: string){
    await this.item(asin).click();
  }

  async priceItem(asin: string): Promise<string> {
    const itemLocator = this.item(asin);
    const price = await itemLocator.locator('span[data-a-size="xl"][data-a-color="base"].a-price').textContent();
    if (price === null) {
      throw new Error(`Price not found for ASIN: ${asin}`);
    }
    const cleanPrice = price.trim().match(/[\d,]+\s*€/)?.[0] || price;
    return cleanPrice;
  }
}
