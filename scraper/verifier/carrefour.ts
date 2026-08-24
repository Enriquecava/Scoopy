import { HomePage } from '../page/carrefour/homePage';
import { CookiesPage } from '../page/carrefour/cookiesPage';
import { SearchListPage } from '../page/carrefour/searchListPage';
import { logger, normalizeLogError, VERIFIER_LOG_EVENT } from '../utils/logger';
import { VerifierFn } from '../utils/types';

export const carrefourVerifier: VerifierFn = async ({ context, productId, url }) => {
  try {
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_STARTED, provider: 'carrefour', productId },
      'Starting Carrefour verification',
    );

    const page = await context.newPage();
    await page.goto(url);
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

   
    const image = await searchListPage.getItemImage();
     logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_IMAGE_OBTAINED, provider: 'carrefour', productId },
      'Carrefour product image obtained',
    );
    //const base64 = image.toString('base64');
    //const dataUri = `data:image/png;base64,${base64}`;
    return image;
  } catch (error) {
    logger.error(
      {
        event: VERIFIER_LOG_EVENT.VERIFICATION_FAILED,
        provider: 'carrefour',
        productId,
        error: normalizeLogError(error),
      },
      'Carrefour verification failed',
    );
    throw error;
  }
};
