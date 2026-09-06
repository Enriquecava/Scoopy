import { logger, normalizeLogError, VERIFIER_LOG_EVENT } from '../utils/logger';
import { VerifierFn } from '../utils/types';
import { CookiesPage } from '../page/primor/cookiePage';
import { HomePage } from '../page/primor/homePage';
import { SearchListPage } from '../page/primor/searchListPage';
export const primorVerifier: VerifierFn = async ({ context, productId, url }) => {
  try {
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_STARTED, provider: 'primor', productId },
      'Starting Primor verification',
    );

    const page = await context.newPage();
    await page.goto(url);
    const cookiesPage = new CookiesPage(page);
    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    
    await cookiesPage.clickRejectButton();
    await homePage.searchForReference(productId);

    const image = await searchListPage.getItemImage();
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_IMAGE_OBTAINED, provider: 'primor', productId },
      'Primor product image obtained',
    );
    //const base64 = image.toString('base64');
    //const dataUri = `data:image/png;base64,${base64}`;
    return image;
  } catch (error) {
    logger.error(
      {
        event: VERIFIER_LOG_EVENT.VERIFICATION_FAILED,
        provider: 'primor',
        productId,
        error: normalizeLogError(error),
      },
      'Primor verification failed',
    );
    throw error;
  }
};
