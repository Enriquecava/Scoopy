export const featureFlags = {
  addProductWizard: import.meta.env.VITE_FEATURE_ADD_PRODUCT_WIZARD?.toLowerCase() === 'true',
} as const
