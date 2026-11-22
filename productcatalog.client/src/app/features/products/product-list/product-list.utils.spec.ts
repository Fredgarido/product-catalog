import { Product } from '../../../core/models/product'
import { compareBy, isInStockRange, parseStock } from './product-list.utils'

function makeProduct(name: string, stockQuantity: number, price = 10): Product {
  return {
    id: 100001,
    name,
    description: null,
    price,
    stockQuantity,
    categoryId: 1,
    categoryName: 'Lenses',
    createdAt: '2026-11-03T10:00:00Z',
    updatedAt: '2026-11-03T10:00:00Z',
  }
}

describe('product list utils', () => {
  it('isInStockRange includes both boundaries and treats null as no limit', () => {
    const range = { minStock: 3, maxStock: 5 }

    expect(isInStockRange(makeProduct('a', 3), range)).toBe(true)
    expect(isInStockRange(makeProduct('a', 5), range)).toBe(true)
    expect(isInStockRange(makeProduct('a', 6), range)).toBe(false)
    expect(isInStockRange(makeProduct('a', 1000), { minStock: null, maxStock: null })).toBe(true)
  })

  it('compareBy orders text alphabetically and numbers numerically', () => {
    expect(
      compareBy('name', makeProduct('Lens Cap', 0), makeProduct('Precision Lens', 0)),
    ).toBeLessThan(0)
    expect(compareBy('price', makeProduct('a', 0, 9), makeProduct('b', 0, 100))).toBeLessThan(0)
  })

  it('parseStock accepts whole non-negative numbers and returns null otherwise', () => {
    expect(parseStock('7')).toBe(7)
    expect(parseStock('')).toBeNull()
    expect(parseStock('-1')).toBeNull()
    expect(parseStock('2.5')).toBeNull()
  })
})
