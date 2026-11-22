import { HttpErrorResponse } from '@angular/common/http'
import { Injectable, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import {
  EMPTY,
  Observable,
  catchError,
  debounceTime,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs'
import { Product } from '../../../core/models/product'
import { ProductApi } from '../../../core/services/product-api'
import { StockRange, isInStockRange, maxStockLevel } from './product-list.utils'

interface ProductFilters extends StockRange {
  name: string
  reloadCount: number
}

/** State of the product list page: filters, loaded products, loading and error. */
@Injectable()
export class ProductListStore {
  private readonly productApi = inject(ProductApi)

  readonly searchTerm = signal('')
  readonly minStock = signal<number | null>(null)
  readonly maxStock = signal<number | null>(null)
  private readonly reloadCount = signal(0)

  private readonly productsState = signal<Product[]>([])
  private readonly loadingState = signal(true)
  private readonly errorState = signal<string | null>(null)

  readonly products = this.productsState.asReadonly()
  readonly loading = this.loadingState.asReadonly()
  readonly error = this.errorState.asReadonly()

  readonly totalStock = computed(() =>
    this.products().reduce((sum, product) => sum + product.stockQuantity, 0),
  )

  readonly rangeError = computed(() => {
    const min = this.minStock()
    const max = this.maxStock()
    return min !== null && max !== null && min > max
      ? 'Minimum stock cannot be greater than maximum stock.'
      : null
  })

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim() !== '' || this.minStock() !== null || this.maxStock() !== null,
  )

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

  retry(): void {
    this.reloadCount.update((count) => count + 1)
  }

  /** Swaps in an updated product, dropping it if it no longer matches the stock filter. */
  replace(updated: Product): void {
    const range = this.filters()
    this.productsState.update((products) =>
      products
        .map((product) => (product.id === updated.id ? updated : product))
        .filter((product) => isInStockRange(product, range)),
    )
  }

  /** Deletes a product and removes it from the list. A 404 means it is already gone. */
  delete(id: number): Observable<void> {
    return this.productApi.delete(id).pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of(undefined) : throwError(() => error),
      ),
      tap(() =>
        this.productsState.update((products) => products.filter((product) => product.id !== id)),
      ),
    )
  }

  private loadProducts(filters: ProductFilters): Observable<Product[]> {
    const { minStock, maxStock } = filters
    if (minStock !== null && maxStock !== null && minStock > maxStock) {
      this.loadingState.set(false)
      return EMPTY
    }

    this.loadingState.set(true)
    this.errorState.set(null)

    return this.fetchProducts(filters).pipe(
      tap((products) => {
        this.productsState.set(products)
        this.loadingState.set(false)
      }),
      catchError(() => {
        this.errorState.set(
          'Could not load products. Please check that the API is running and try again.',
        )
        this.loadingState.set(false)
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
}
