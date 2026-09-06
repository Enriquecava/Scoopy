import { common, commonEn } from './common'
import { auth as esAuth } from './es/auth'
import { products as esProducts } from './es/products'
import { auth as enAuth } from './en/auth'
import { products as enProducts } from './en/products'
import { admin as esAdmin } from './es/admin'
import { admin as enAdmin } from './en/admin'

export const translations = {
  es: {
    common,
    auth: esAuth,
    products: esProducts,
    admin: esAdmin,
  },
  en: {
    common: commonEn,
    auth: enAuth,
    products: enProducts,
    admin: enAdmin,
  },
} as const
