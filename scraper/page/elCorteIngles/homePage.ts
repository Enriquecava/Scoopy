import { Page, Locator } from '@playwright/test';

export class HomePage {
  private page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBar = page.getByTestId('SearchBarLink');
    this.searchInput = page.locator('#search-bar__input');
    this.searchButton = page.locator('[data-synth="LOCATOR_SEARCH_BUTTON"]');
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
    await this.clickSearchBar()
    await this.typeSearch(reference)
    await this.clickSearchButton()
  }
}
