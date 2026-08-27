import { Page,Locator } from '@playwright/test';

export class HomePage {
  private page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchBar: Locator;
  readonly continueModalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBar = page.locator('#search');
    this.searchInput = page.locator('[name="search[query]"]')
    this.searchButton = page.locator('label[data-role="minisearch-label"]')
    this.continueModalButton = page.getByRole('button', { name: 'Continuar' })
  }

  async clickContinueModalButton(){
    if (await this.continueModalButton.isVisible()) {
      await this.continueModalButton.click()
    }
  }
  
  async clickSearchBar(){
    await this.searchBar.click()
  }

  async typeSearch(reference: string){
    await this.searchInput.fill(reference)
  }

  async clickSearchButton(){
    await this.searchButton.click()
  }

  async searchForReference(reference:string){
    await this.clickContinueModalButton()
    await this.clickSearchBar()
    await this.typeSearch(reference)
    }
}
