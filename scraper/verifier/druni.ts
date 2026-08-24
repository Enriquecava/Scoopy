
import { CookiesPage } from '../page/druni/cookiesPage';
import { HomePage } from '../page/druni/homePage';
import { SearchListPage } from '../page/druni/searchListPage';
import { logger, normalizeLogError, VERIFIER_LOG_EVENT } from '../utils/logger';
import { VerifierFn } from '../utils/types';

export const druniVerifier: VerifierFn = async ({ context, productId, url }) => {
  try {
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_STARTED, provider: 'druni', productId },
      'Starting Druni verification',
    );

    const page = await context.newPage();
    await page.goto(url);
    const cookiesPage = new CookiesPage(page);
    const homePage = new HomePage(page);
    const searchListPage = new SearchListPage(page);
    
    await cookiesPage.clickRejectButton();
    await homePage.searchForReference(productId);
    await page.waitForTimeout(300)
    const image = await searchListPage.getItemImage()
    logger.info(
      { event: VERIFIER_LOG_EVENT.VERIFICATION_IMAGE_OBTAINED, provider: 'druni', productId },
      'Druni product image obtained',
    );
    //const base64 = image.toString('base64');
    //const dataUri = `data:image/png;base64,${base64}`;
    return image;
  } catch (error) {
    logger.error(
      {
        event: VERIFIER_LOG_EVENT.VERIFICATION_FAILED,
        provider: 'druni',
        productId,
        error: normalizeLogError(error),
      },
      'Druni verification failed',
    );
    throw error;
  }
};
