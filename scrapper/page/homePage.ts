import { Page,Locator } from '@playwright/test';

export class HomePage {
  private page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;


  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('#twotabsearchtextbox');
    this.searchButton = page.locator('#nav-search-submit-button')
  }
  
  async clickSearchBar(){
    await this.searchInput.click()
  }

  async typeSearch(asin: string){
    await this.searchInput.fill(asin)
  }

  async clickSearchButton(){
    await this.searchButton.click()
  }

  async searchForAsing(asin:string){
    await this.clickSearchBar()
    await this.typeSearch(asin)
    await this.clickSearchButton()
  }
}
