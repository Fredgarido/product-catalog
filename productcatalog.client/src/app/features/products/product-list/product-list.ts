import { Component, computed, inject, signal } from '@angular/core'
import { MatButton } from '@angular/material/button'
import { MatIcon } from '@angular/material/icon'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { RouterLink } from '@angular/router'
import { Product } from '../../../core/models/product'
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog'
import { StockDialog } from '../stock-dialog/stock-dialog'
import { ProductFilters } from './product-filters/product-filters'
import { ProductListStore } from './product-list.store'
import { ProductTable } from './product-table/product-table'

@Component({
  selector: 'app-product-list',
  imports: [
    RouterLink,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    ConfirmDialog,
    StockDialog,
    ProductFilters,
    ProductTable,
  ],
  providers: [ProductListStore],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  protected readonly store = inject(ProductListStore)

  protected readonly stockProduct = signal<Product | null>(null)
  protected readonly productToDelete = signal<Product | null>(null)
  protected readonly deleting = signal(false)
  protected readonly deleteError = signal<string | null>(null)

  protected readonly deleteMessage = computed(() => {
    const product = this.productToDelete()
    return product ? `Delete "${product.name}" (ID ${product.id})? This cannot be undone.` : ''
  })

  protected onStockChanged(updated: Product): void {
    this.store.replace(updated)
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

    this.store.delete(product.id).subscribe({
      next: () => {
        this.productToDelete.set(null)
        this.deleting.set(false)
      },
      error: () => {
        this.deleting.set(false)
        this.deleteError.set('Could not delete the product. Please try again.')
      },
    })
  }
}
