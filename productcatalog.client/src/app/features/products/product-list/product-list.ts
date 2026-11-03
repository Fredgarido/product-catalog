import { CurrencyPipe, DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
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

const maxStockLevel = 2_147_483_647

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, DatePipe, RouterLink, ConfirmDialog, StockDialog],
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

  protected retry(): void {
    this.reloadCount.update((count) => count + 1)
  }

  protected onStockChanged(updated: Product): void {
    this.products.update((products) =>
      products.map((product) => (product.id === updated.id ? updated : product)),
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
    const hasRange = filters.minStock !== null || filters.maxStock !== null
    const min = filters.minStock ?? 0
    const max = filters.maxStock ?? maxStockLevel

    if (filters.name) {
      return this.productApi
        .search(filters.name)
        .pipe(
          map((products) =>
            hasRange
              ? products.filter((p) => p.stockQuantity >= min && p.stockQuantity <= max)
              : products,
          ),
        )
    }

    if (hasRange) {
      return this.productApi.getByStockLevel(min, max)
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
