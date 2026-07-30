import { parsePriceToEuros } from '../function/common';
import { CookiesPage } from '../page/carrefour/cookiesPage';
import { SearchListPage } from '../page/carrefour/searchListPage';
import { ScraperFn } from '../utils/types';
import { HomePage } from '../page/carrefour/homePage';

export const carrefourScraper: ScraperFn = async ({context,productId }) => {
  try{
    const page = await context.newPage();
    await page.goto(`https://www.carrefour.es/`); 
    const homePage = new HomePage(page)
    const searchListPage = new SearchListPage(page)
    const cookiesPage = new CookiesPage(page)

    await cookiesPage.clickRejectButton()
    await page.waitForTimeout(500) // If done without this waits it crash
    await homePage.clickSearchBar()
    await page.waitForTimeout(500) // If done without this waits it crash
    await homePage.typeSearch(productId)
    await page.waitForTimeout(500) // If done without this waits it crash
    await homePage.clickSearchButton()

    const rawPrice = await searchListPage.priceItem()
    return parsePriceToEuros(rawPrice);


  }
  finally{
    await context.close()
  }

}