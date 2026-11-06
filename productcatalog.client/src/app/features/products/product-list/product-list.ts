import { CurrencyPipe, DatePipe } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { Component, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import { MatButton, MatIconButton } from '@angular/material/button'
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field'
import { MatIcon } from '@angular/material/icon'
import { MatInput } from '@angular/material/input'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { MatTooltip } from '@angular/material/tooltip'
import { RouterLink } from '@angular/router'
import { EMPTY, Observable, catchError, debounceTime, map, switchMap, tap } from 'rxjs'
import { Product } from '../../../core/models/product'
import { ProductApi } from '../../../core/services/product-api'
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog'
import { StockDialog } from '../stock-dialog/stock-dialog'

interface ProductFilters {
  name: string
  minStock: number | null
  maxStock: number | null
  reloadCount: number
}

type SortColumn = 'id' | 'name' | 'categoryName' | 'price' | 'stockQuantity'
type SortDirection = 'asc' | 'desc'

interface SortState {
  column: SortColumn
  direction: SortDirection
}

const maxStockLevel = 2_147_483_647

function isInStockRange(product: Product, { minStock, maxStock }: ProductFilters): boolean {
  return (
    product.stockQuantity >= (minStock ?? 0) && product.stockQuantity <= (maxStock ?? maxStockLevel)
  )
}

function compareBy(column: SortColumn, a: Product, b: Product): number {
  const left = a[column]
  const right = b[column]

  return typeof left === 'string' && typeof right === 'string'
    ? left.localeCompare(right)
    : Number(left) - Number(right)
}

@Component({
  selector: 'app-product-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MatProgressSpinner,
    MatTooltip,
    ConfirmDialog,
    StockDialog,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly productApi = inject(ProductApi)

  protected readonly lowStockThreshold = 5

  protected readonly searchTerm = signal('')
  protected readonly minStock = signal<number | null>(null)
  protected readonly maxStock = signal<number | null>(null)
  private readonly reloadCount = signal(0)

  protected readonly products = signal<Product[]>([])
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)

  protected readonly sortableColumns: { key: SortColumn; label: string; numeric?: boolean }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'categoryName', label: 'Category' },
    { key: 'price', label: 'Price', numeric: true },
    { key: 'stockQuantity', label: 'Stock', numeric: true },
  ]
  protected readonly sort = signal<SortState | null>(null)

  protected readonly sortedProducts = computed(() => {
    const products = this.products()
    const sort = this.sort()

    if (!sort) {
      return products
    }

    const direction = sort.direction === 'asc' ? 1 : -1
    return [...products].sort((a, b) => direction * compareBy(sort.column, a, b))
  })

  protected readonly totalStock = computed(() =>
    this.products().reduce((sum, product) => sum + product.stockQuantity, 0),
  )

  protected readonly rangeError = computed(() => {
    const min = this.minStock()
    const max = this.maxStock()
    return min !== null && max !== null && min > max
      ? 'Minimum stock cannot be greater than maximum stock.'
      : null
  })

  protected readonly hasActiveFilters = computed(
    () => this.searchTerm().trim() !== '' || this.minStock() !== null || this.maxStock() !== null,
  )

  protected readonly stockProduct = signal<Product | null>(null)
  protected readonly productToDelete = signal<Product | null>(null)
  protected readonly deleting = signal(false)
  protected readonly deleteError = signal<string | null>(null)

  protected readonly deleteMessage = computed(() => {
    const product = this.productToDelete()
    return product ? `Delete "${product.name}" (ID ${product.id})? This cannot be undone.` : ''
  })

  private readonly filters = computed<ProductFilters>(() => ({
    name: this.searchTerm().trim(),
    minStock: this.minStock(),
    maxStock: this.maxStock(),
    reloadCount: this.reloadCount(),
  }))

  constructor() {
    toObservable(this.filters)
      .pipe(
        debounceTime(300),
        switchMap((filters) => this.loadProducts(filters)),
        takeUntilDestroyed(),
      )
      .subscribe()
  }

  protected setMinStock(value: string): void {
    this.minStock.set(this.parseStock(value))
  }

  protected setMaxStock(value: string): void {
    this.maxStock.set(this.parseStock(value))
  }

  protected showLowStock(): void {
    this.minStock.set(0)
    this.maxStock.set(this.lowStockThreshold)
  }

  protected clearFilters(): void {
    this.searchTerm.set('')
    this.minStock.set(null)
    this.maxStock.set(null)
  }

  protected sortBy(column: SortColumn): void {
    this.sort.update((current) => ({
      column,
      direction: current?.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  protected sortDirection(column: SortColumn): SortDirection | null {
    const sort = this.sort()
    return sort?.column === column ? sort.direction : null
  }

  protected retry(): void {
    this.reloadCount.update((count) => count + 1)
  }

  protected onStockChanged(updated: Product): void {
    const filters = this.filters()
    this.products.update((products) =>
      products
        .map((product) => (product.id === updated.id ? updated : product))
        .filter((product) => isInStockRange(product, filters)),
    )
    this.stockProduct.set(null)
  }

  protected askDelete(product: Product): void {
    this.deleteError.set(null)
    this.productToDelete.set(product)
  }

  protected deleteProduct(): void {
    const product = this.productToDelete()

    if (!product) {
      return
    }

    this.deleting.set(true)
    this.deleteError.set(null)

    this.productApi.delete(product.id).subscribe({
      next: () => this.removeFromList(product.id),
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.removeFromList(product.id)
          return
        }

        this.deleting.set(false)
        this.deleteError.set('Could not delete the product. Please try again.')
      },
    })
  }

  private removeFromList(id: number): void {
    this.products.update((products) => products.filter((product) => product.id !== id))
    this.productToDelete.set(null)
    this.deleting.set(false)
  }

  private loadProducts(filters: ProductFilters): Observable<Product[]> {
    const { minStock, maxStock } = filters
    if (minStock !== null && maxStock !== null && minStock > maxStock) {
      this.loading.set(false)
      return EMPTY
    }

    this.loading.set(true)
    this.error.set(null)

    return this.fetchProducts(filters).pipe(
      tap((products) => {
        this.products.set(products)
        this.loading.set(false)
      }),
      catchError(() => {
        this.error.set(
          'Could not load products. Please check that the API is running and try again.',
        )
        this.loading.set(false)
        return EMPTY
      }),
    )
  }

  private fetchProducts(filters: ProductFilters): Observable<Product[]> {
    if (filters.name) {
      return this.productApi
        .search(filters.name)
        .pipe(map((products) => products.filter((product) => isInStockRange(product, filters))))
    }

    if (filters.minStock !== null || filters.maxStock !== null) {
      return this.productApi.getByStockLevel(
        filters.minStock ?? 0,
        filters.maxStock ?? maxStockLevel,
      )
    }

    return this.productApi.getAll()
  }

  private parseStock(value: string): number | null {
    if (value.trim() === '') {
      return null
    }

    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }
}
