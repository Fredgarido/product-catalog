import { Component, input, model } from '@angular/core'
import { MatButton } from '@angular/material/button'
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field'
import { MatIcon } from '@angular/material/icon'
import { MatInput } from '@angular/material/input'
import { lowStockThreshold, parseStock } from '../product-list.utils'

@Component({
  selector: 'app-product-filters',
  imports: [MatButton, MatFormField, MatLabel, MatPrefix, MatIcon, MatInput],
  templateUrl: './product-filters.html',
  styleUrl: './product-filters.css',
})
export class ProductFilters {
  readonly searchTerm = model('')
  readonly minStock = model<number | null>(null)
  readonly maxStock = model<number | null>(null)
  readonly canClear = input(false)

  protected setMinStock(value: string): void {
    this.minStock.set(parseStock(value))
  }

  protected setMaxStock(value: string): void {
    this.maxStock.set(parseStock(value))
  }

  protected showLowStock(): void {
    this.minStock.set(0)
    this.maxStock.set(lowStockThreshold)
  }

  protected clear(): void {
    this.searchTerm.set('')
    this.minStock.set(null)
    this.maxStock.set(null)
  }
}
