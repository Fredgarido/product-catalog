import { HttpErrorResponse } from '@angular/common/http'
import { Component, OnInit, inject, input, signal } from '@angular/core'
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { Category } from '../../../core/models/category'
import { ValidationProblemDetails } from '../../../core/models/problem-details'
import { productConstraints as limits } from '../../../core/models/product-constraints'
import { CategoryApi } from '../../../core/services/category-api'
import { ProductApi } from '../../../core/services/product-api'

type FieldName = 'name' | 'description' | 'price' | 'stockQuantity' | 'categoryId'

function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { blank: true }
    : null
}

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly productApi = inject(ProductApi)
  private readonly categoryApi = inject(CategoryApi)
  private readonly router = inject(Router)

  readonly id = input<string>()

  protected readonly limits = limits
  protected readonly categories = signal<Category[]>([])
  protected readonly currentStock = signal<number | null>(null)
  protected readonly loading = signal(false)
  protected readonly saving = signal(false)
  protected readonly loadError = signal<string | null>(null)
  protected readonly serverError = signal<string | null>(null)

  protected readonly form = this.fb.group({
    name: [
      '',
      [
        Validators.required,
        notBlank,
        Validators.minLength(limits.nameMinLength),
        Validators.maxLength(limits.nameMaxLength),
      ],
    ],
    description: ['', [Validators.maxLength(limits.descriptionMaxLength)]],
    price: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(limits.priceMin),
      Validators.max(limits.priceMax),
    ]),
    stockQuantity: this.fb.control<number | null>(0, [
      Validators.required,
      Validators.min(limits.stockMin),
      Validators.max(limits.stockMax),
      Validators.pattern(/^\d+$/),
    ]),
    categoryId: this.fb.control<number | null>(null, [Validators.required]),
  })

  protected get isEditMode(): boolean {
    return this.id() !== undefined
  }

  ngOnInit(): void {
    this.categoryApi.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.loadError.set('Could not load categories. Please try again later.'),
    })

    if (this.isEditMode) {
      this.form.controls.stockQuantity.disable()
      this.loadProduct(Number(this.id()))
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }

    const value = this.form.getRawValue()
    const request = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      price: value.price!,
      categoryId: value.categoryId!,
    }

    this.saving.set(true)
    this.serverError.set(null)

    const save$ = this.isEditMode
      ? this.productApi.update(Number(this.id()), request)
      : this.productApi.create({ ...request, stockQuantity: value.stockQuantity! })

    save$.subscribe({
      next: () => this.router.navigate(['/products']),
      error: (error: HttpErrorResponse) => {
        this.saving.set(false)
        this.applyServerErrors(error)
      },
    })
  }

  protected fieldError(field: FieldName): string | null {
    const control = this.form.controls[field]
    const errors = control.errors

    if (!control.touched || !errors) {
      return null
    }

    if (errors['required'] || errors['blank']) {
      return 'This field is required.'
    }
    if (errors['minlength']) {
      return `Must be at least ${errors['minlength'].requiredLength} characters.`
    }
    if (errors['maxlength']) {
      return `Must be at most ${errors['maxlength'].requiredLength} characters.`
    }
    if (errors['min']) {
      return `Must be at least ${errors['min'].min}.`
    }
    if (errors['max']) {
      return `Must be at most ${errors['max'].max}.`
    }
    if (errors['pattern']) {
      return 'Must be a whole number.'
    }
    if (errors['server']) {
      return errors['server']
    }

    return 'Invalid value.'
  }

  private loadProduct(id: number): void {
    if (!Number.isInteger(id)) {
      this.loadError.set('Product not found.')
      return
    }

    this.loading.set(true)

    this.productApi.getById(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          categoryId: product.categoryId,
        })
        this.currentStock.set(product.stockQuantity)
        this.loading.set(false)
      },
      error: (error: HttpErrorResponse) => {
        this.loadError.set(
          error.status === 404 ? 'Product not found.' : 'Could not load the product.',
        )
        this.loading.set(false)
      },
    })
  }

  private applyServerErrors(error: HttpErrorResponse): void {
    const problem = error.error as ValidationProblemDetails | null

    if (error.status === 400 && problem?.errors) {
      for (const [field, messages] of Object.entries(problem.errors)) {
        const controlName = field.charAt(0).toLowerCase() + field.slice(1)
        const control = this.form.get(controlName)

        if (control) {
          control.setErrors({ server: messages[0] })
          control.markAsTouched()
        } else {
          this.serverError.set(messages[0])
        }
      }
      return
    }

    this.serverError.set(
      problem?.detail ?? problem?.title ?? 'Could not save the product. Please try again.',
    )
  }
}
