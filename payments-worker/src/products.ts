export type ProductId = 'invoice-pack' | 'advance-receipt'

export type Product = {
  id: ProductId
  name: string
  refPrefix: 'IP' | 'AR'
  amountPaise: number
  currency: 'INR'
}

// The only source of truth for prices. The browser sends a product id, never an amount.
export const PRODUCTS: Readonly<Record<ProductId, Product>> = Object.freeze({
  'invoice-pack': { id: 'invoice-pack', name: 'Invoice Pack', refPrefix: 'IP', amountPaise: 499 * 100, currency: 'INR' },
  'advance-receipt': { id: 'advance-receipt', name: 'Advance Receipt', refPrefix: 'AR', amountPaise: 399 * 100, currency: 'INR' },
})

export function findProduct(id: unknown): Product | null {
  return typeof id === 'string' && Object.hasOwn(PRODUCTS, id) ? PRODUCTS[id as ProductId] : null
}
