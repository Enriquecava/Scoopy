import { Page,Locator } from '@playwright/test';

export class CookiesPage {
  private page: Page;
  readonly acceptButton: Locator;


  constructor(page: Page) {
    this.page = page;
    this.acceptButton = page.locator('#sp-cc-accept');
  }
  
  async clickAcceptButton(){
    await this.acceptButton.click();
  }

}
