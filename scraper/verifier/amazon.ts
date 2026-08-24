import { CookiesPage } from '../page/amazon/cookiesPage';
import { HomePage } from '../page/amazon/homePage';
import { SearchListPage } from '../page/amazon/searchListPage';
import { logger, normalizeLogError, VERIFIER_LOG_EVENT } from '../utils/logger';
import { VerifierFn } from '../utils/types';

export const amazonVerifier: VerifierFn = async ({ context, productId, url }) => {
  try {
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_STARTED, provider: 'amazon', productId },
      'Starting Amazon verification',
    );

    const page = await context.newPage();
    await page.goto(url);

    const cookiesPage = new CookiesPage(page);
    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);

    await cookiesPage.clickAcceptButton();
    await homePage.searchForAsin(productId);
    const image = await searchListPage.getItemImage(productId);
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_IMAGE_OBTAINED, provider: 'amazon', productId },
      'Amazon product image obtained',
    );
    //const base64 = image.toString('base64');
    //const dataUri = `data:image/png;base64,${base64}`;
    return image;
  } catch (error) {
    logger.error(
      {
        event: VERIFIER_LOG_EVENT.VERIFICATION_FAILED,
        provider: 'amazon',
        productId,
        error: normalizeLogError(error),
      },
      'Amazon verification failed',
    );
    throw error;
  }
};
