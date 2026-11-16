import { Page,Locator } from '@playwright/test';

export class CookiesPage {
  private page: Page;
  readonly acceptButton: Locator;


  constructor(page: Page) {
    this.page = page;
    this.acceptButton = page.locator('#sp-cc-accept');
  }
  
  async clickAcceptButton(){
    await this.acceptButton.waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => {});

    if (await this.acceptButton.isVisible()) {
        await this.acceptButton.click();
    }
  }

}
