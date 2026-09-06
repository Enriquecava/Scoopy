type Translate = (key: string, values?: Record<string, string | number>) => string

type ProductCreationErrorPayload = {
  error?: unknown
  product_name?: unknown
}

function getFirstErrorPayload(error: unknown): ProductCreationErrorPayload | null {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return null
  }

  const response = error.response
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return null
  }

  const data = response.data
  if (typeof data !== 'object' || data === null || !('errors' in data) || !Array.isArray(data.errors)) {
    return null
  }

  const firstError = data.errors[0]
  return typeof firstError === 'object' && firstError !== null ? firstError : null
}

export function getProductCreationErrorMessage(error: unknown, t: Translate) {
  const payload = getFirstErrorPayload(error)

  if (payload?.error === 'duplicate_ssn') {
    if (typeof payload.product_name === 'string' && payload.product_name.trim()) {
      return t('products.addProduct.duplicateSSNError', { productName: payload.product_name })
    }

    return t('products.addProduct.duplicateSSNErrorWithoutProductName')
  }

  return t('products.addProduct.createError')
}