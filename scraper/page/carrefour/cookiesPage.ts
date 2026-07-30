import { Page,Locator } from '@playwright/test';

export class CookiesPage {
  private page: Page;
  readonly rejectButton: Locator;


  constructor(page: Page) {
    this.page = page;
    this.rejectButton = page.locator('#onetrust-reject-all-handler');
  }
  
  async clickRejectButton(){
    await this.rejectButton.click();
  }

}
