import { common, commonEn } from './common'
import { auth as esAuth } from './es/auth'
import { products as esProducts } from './es/products'
import { auth as enAuth } from './en/auth'
import { products as enProducts } from './en/products'

export const translations = {
  es: {
    common,
    auth: esAuth,
    products: esProducts,
  },
  en: {
    common: commonEn,
    auth: enAuth,
    products: enProducts,
  },
} as const
