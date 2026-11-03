import { HttpErrorResponse } from '@angular/common/http'
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ProblemDetails } from '../../../core/models/problem-details'
import { Product } from '../../../core/models/product'
import { productConstraints as limits } from '../../../core/models/product-constraints'
import { ProductApi } from '../../../core/services/product-api'
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog'

type StockMode = 'add' | 'remove'

@Component({
  selector: 'app-stock-dialog',
  imports: [ReactiveFormsModule, ConfirmDialog],
  templateUrl: './stock-dialog.html',
  styleUrl: './stock-dialog.css',
})
export class StockDialog {
  private readonly productApi = inject(ProductApi)

  readonly product = input<Product | null>(null)
  readonly stockChanged = output<Product>()
  readonly closed = output<void>()

  protected readonly limits = limits
  protected readonly mode = signal<StockMode>('add')
  protected readonly saving = signal(false)
  protected readonly error = signal<string | null>(null)

  protected readonly quantity = new FormControl<number | null>(1, [
    Validators.required,
    Validators.min(1),
    Validators.max(limits.stockMax),
    Validators.pattern(/^\d+$/),
  ])

  constructor() {
    effect(() => {
      if (this.product()) {
        untracked(() => {
          this.mode.set('add')
          this.quantity.reset(1)
          this.error.set(null)
        })
      }
    })
  }

  protected apply(): void {
    const product = this.product()

    if (!product || this.quantity.invalid) {
      this.quantity.markAsTouched()
      return
    }

    const quantity = this.quantity.value!
    this.saving.set(true)
    this.error.set(null)

    const request$ =
      this.mode() === 'add'
        ? this.productApi.addStock(product.id, quantity)
        : this.productApi.decrementStock(product.id, quantity)

    request$.subscribe({
      next: (updated) => {
        this.saving.set(false)
        this.stockChanged.emit(updated)
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false)
        const problem = error.error as ProblemDetails | null
        this.error.set(problem?.detail ?? 'Could not update the stock. Please try again.')
      },
    })
  }
}
