const PRODUCT_NAME_PATTERN = /^[\p{L}\p{N}\s]*$/u

export function isValidProductNameInput(value: string): boolean {
  return PRODUCT_NAME_PATTERN.test(value)
}

export function sanitizeProductNameInput(value: string): string {
  return Array.from(value)
    .filter((char) => isValidProductNameInput(char))
    .join('')
}

export function isProductNameSubmittable(value: string): boolean {
  return value.trim().length > 0 && isValidProductNameInput(value)
}
