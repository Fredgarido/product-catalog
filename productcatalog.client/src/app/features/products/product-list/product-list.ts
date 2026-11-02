import { CurrencyPipe, DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { Product } from '../../../core/models/product'
import { ProductApi } from '../../../core/services/product-api'

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly productApi = inject(ProductApi)

  protected readonly products = signal<Product[]>([])
  protected readonly loading = signal(false)
  protected readonly error = signal<string | null>(null)

  protected readonly totalStock = computed(() =>
    this.products().reduce((sum, product) => sum + product.stockQuantity, 0),
  )

  protected readonly lowStockThreshold = 5

  constructor() {
    this.loadProducts()
  }

  protected loadProducts(): void {
    this.loading.set(true)
    this.error.set(null)

    this.productApi.getAll().subscribe({
      next: (products) => {
        this.products.set(products)
        this.loading.set(false)
      },
      error: () => {
        this.error.set(
          'Could not load products. Please check that the API is running and try again.',
        )
        this.loading.set(false)
      },
    })
  }
}
