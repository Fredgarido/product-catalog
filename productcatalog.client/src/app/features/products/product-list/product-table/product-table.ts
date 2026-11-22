import { CurrencyPipe, DatePipe } from '@angular/common'
import { Component, computed, input, output, signal } from '@angular/core'
import { MatIconButton } from '@angular/material/button'
import { MatIcon } from '@angular/material/icon'
import { MatTooltip } from '@angular/material/tooltip'
import { RouterLink } from '@angular/router'
import { Product } from '../../../../core/models/product'
import { SortColumn, compareBy, lowStockThreshold } from '../product-list.utils'

type SortDirection = 'asc' | 'desc'

interface SortState {
  column: SortColumn
  direction: SortDirection
}

@Component({
  selector: 'app-product-table',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatIconButton, MatIcon, MatTooltip],
  templateUrl: './product-table.html',
  styleUrl: './product-table.css',
})
export class ProductTable {
  readonly products = input.required<Product[]>()
  readonly emptyMessage = input('No products found.')

  readonly adjustStock = output<Product>()
  readonly deleteProduct = output<Product>()

  protected readonly lowStockThreshold = lowStockThreshold

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
}
