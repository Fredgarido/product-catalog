import { Product } from '../../../core/models/product'

export type SortColumn = 'id' | 'name' | 'categoryName' | 'price' | 'stockQuantity'

export interface StockRange {
  minStock: number | null
  maxStock: number | null
}

export const lowStockThreshold = 5
export const maxStockLevel = 2_147_483_647

export function isInStockRange(product: Product, { minStock, maxStock }: StockRange): boolean {
  return (
    product.stockQuantity >= (minStock ?? 0) && product.stockQuantity <= (maxStock ?? maxStockLevel)
  )
}

export function compareBy(column: SortColumn, a: Product, b: Product): number {
  const left = a[column]
  const right = b[column]

  return typeof left === 'string' && typeof right === 'string'
    ? left.localeCompare(right)
    : Number(left) - Number(right)
}

export function parseStock(value: string): number | null {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}
